package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"melody-server/internal/models"
	"melody-server/internal/productcontent"
)

type productListResponse struct {
	Products []models.Product `json:"products"`
}

type blogListResponse struct {
	Posts []models.BlogPostSummary `json:"posts"`
}

type productResponse struct {
	Product models.Product `json:"product"`
}

type blogResponse struct {
	Post models.BlogPost `json:"post"`
}

var relatedBlogSlugs = map[string][]string{
	"fabric-flowers-for-evening-dress": {
		"what-is-kerisheh-fabric-flower",
		"what-is-stumpwork-flower",
		"3d-flower-on-dress",
	},
	"fabric-flower-for-wedding-dress": {
		"chiffon-fabric-flower-for-dress",
		"3d-flower-on-dress",
		"match-fabric-flower-color-with-dress",
	},
	"what-is-kerisheh-fabric-flower": {
		"fabric-flowers-for-evening-dress",
		"3d-flower-on-dress",
		"match-fabric-flower-color-with-dress",
	},
}

func main() {
	apply := flag.Bool("apply", false, "apply the validated content through the admin API")
	baseURL := flag.String("base-url", "http://127.0.0.1:8080/api/v1", "API base URL")
	flag.Parse()

	token := strings.TrimSpace(os.Getenv("ADMIN_TOKEN"))
	if token == "" {
		log.Fatal("ADMIN_TOKEN is required")
	}
	client := &http.Client{Timeout: 30 * time.Second}
	entries, err := productcontent.Load()
	if err != nil {
		log.Fatal(err)
	}

	var productList productListResponse
	requestJSON(client, http.MethodGet, *baseURL+"/admin/products", token, nil, &productList)
	var blogList blogListResponse
	requestJSON(client, http.MethodGet, *baseURL+"/admin/blogs", token, nil, &blogList)

	activeBySlug := make(map[string]models.Product)
	for _, product := range productList.Products {
		if product.Status == "active" {
			activeBySlug[product.Slug] = product
		}
	}
	if len(activeBySlug) != len(entries) {
		log.Fatalf("active product count mismatch: API=%d manifest=%d", len(activeBySlug), len(entries))
	}
	blogIDBySlug := make(map[string]string, len(blogList.Posts))
	for _, post := range blogList.Posts {
		blogIDBySlug[post.Slug] = post.ID
	}

	manifestSlugs := make(map[string]struct{}, len(entries))
	for _, entry := range entries {
		product, exists := activeBySlug[entry.Slug]
		if !exists {
			log.Fatalf("active product missing for manifest slug %s", entry.Slug)
		}
		if product.Title != entry.Title {
			log.Fatalf("title mismatch for %s: API=%q manifest=%q", entry.Slug, product.Title, entry.Title)
		}
		manifestSlugs[entry.Slug] = struct{}{}
		product.ShortDescription = entry.ShortDescription
		product.Description = entry.Description
		product.SEOTitle = entry.SEOTitle
		product.SEODescription = entry.SEODescription
		product.RelatedPostIDs = make([]string, 0, len(entry.RelatedBlogSlugs))
		for _, blogSlug := range entry.RelatedBlogSlugs {
			blogID, exists := blogIDBySlug[blogSlug]
			if !exists {
				log.Fatalf("related blog %s for product %s does not exist", blogSlug, entry.Slug)
			}
			product.RelatedPostIDs = append(product.RelatedPostIDs, blogID)
		}
		if *apply {
			var response productResponse
			requestJSON(client, http.MethodPut, *baseURL+"/admin/products/"+product.ID, token, product, &response)
			if response.Product.Slug != entry.Slug || response.Product.Description != entry.Description {
				log.Fatalf("API verification failed for %s", entry.Slug)
			}
		}
		fmt.Printf("%s %s (%d related articles)\n", map[bool]string{true: "updated", false: "validated"}[*apply], entry.Slug, len(product.RelatedPostIDs))
	}
	for slug := range activeBySlug {
		if _, exists := manifestSlugs[slug]; !exists {
			log.Fatalf("active product %s is missing from manifest", slug)
		}
	}

	updateBlogRelations(client, *baseURL, token, blogIDBySlug, *apply)

	slugs := make([]string, 0, len(manifestSlugs))
	for slug := range manifestSlugs {
		slugs = append(slugs, slug)
	}
	sort.Strings(slugs)
	fmt.Printf("complete: %d products, apply=%t\n", len(slugs), *apply)
}

func updateBlogRelations(client *http.Client, baseURL, token string, blogIDBySlug map[string]string, apply bool) {
	sourceSlugs := make([]string, 0, len(relatedBlogSlugs))
	for sourceSlug := range relatedBlogSlugs {
		sourceSlugs = append(sourceSlugs, sourceSlug)
	}
	sort.Strings(sourceSlugs)
	for _, sourceSlug := range sourceSlugs {
		sourceID, exists := blogIDBySlug[sourceSlug]
		if !exists {
			log.Fatalf("source blog %s does not exist", sourceSlug)
		}
		var response blogResponse
		requestJSON(client, http.MethodGet, baseURL+"/admin/blogs/"+sourceID, token, nil, &response)
		response.Post.RelatedPostIDs = make([]string, 0, len(relatedBlogSlugs[sourceSlug]))
		for _, relatedSlug := range relatedBlogSlugs[sourceSlug] {
			relatedID, exists := blogIDBySlug[relatedSlug]
			if !exists {
				log.Fatalf("related blog %s for blog %s does not exist", relatedSlug, sourceSlug)
			}
			response.Post.RelatedPostIDs = append(response.Post.RelatedPostIDs, relatedID)
		}
		if apply {
			var updated blogResponse
			requestJSON(client, http.MethodPut, baseURL+"/admin/blogs/"+sourceID, token, response.Post, &updated)
			if updated.Post.Slug != sourceSlug || len(updated.Post.RelatedPostIDs) != len(response.Post.RelatedPostIDs) {
				log.Fatalf("blog relation verification failed for %s", sourceSlug)
			}
		}
		fmt.Printf("%s blog relations %s (%d related articles)\n", map[bool]string{true: "updated", false: "validated"}[apply], sourceSlug, len(response.Post.RelatedPostIDs))
	}
}

func requestJSON(client *http.Client, method, endpoint, token string, body, target any) {
	var payload io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			log.Fatalf("encode request: %v", err)
		}
		payload = bytes.NewReader(data)
	}
	request, err := http.NewRequest(method, endpoint, payload)
	if err != nil {
		log.Fatal(err)
	}
	request.Header.Set("Authorization", "Bearer "+token)
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	response, err := client.Do(request)
	if err != nil {
		log.Fatalf("%s %s: %v", method, endpoint, err)
	}
	defer response.Body.Close()
	data, err := io.ReadAll(response.Body)
	if err != nil {
		log.Fatal(err)
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		log.Fatalf("%s %s returned %d: %s", method, endpoint, response.StatusCode, strings.TrimSpace(string(data)))
	}
	if target != nil {
		if err := json.Unmarshal(data, target); err != nil {
			log.Fatalf("decode %s: %v", endpoint, err)
		}
	}
}
