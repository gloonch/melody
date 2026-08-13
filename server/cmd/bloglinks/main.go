package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"time"

	"melody-server/internal/blogcontent"
	"melody-server/internal/config"
	"melody-server/internal/database"
	"melody-server/internal/repository"

	"github.com/joho/godotenv"
)

type blogRow struct {
	ID             string
	Slug           string
	BodyHTML       string
	BodyHTMLSource string
	CTALabel       string
	CTAText        string
	CTAURL         string
}

func main() {
	apply := flag.Bool("apply", false, "commit link corrections instead of rolling them back")
	flag.Parse()

	_ = godotenv.Load()
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("configuration failed: %v", err)
	}
	db, err := database.NewPostgresDB(cfg.Database)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	products, err := repository.NewProductRepository(db.Pool()).ListProducts(ctx, false)
	if err != nil {
		log.Fatalf("load active products: %v", err)
	}
	if len(products) == 0 {
		log.Fatal("no active products; refusing to rewrite article links")
	}

	tx, err := db.Pool().Begin(ctx)
	if err != nil {
		log.Fatalf("begin transaction: %v", err)
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, `SELECT id,slug,body_html,body_html_source,cta_label,cta_text,cta_url FROM blog_posts ORDER BY created_at,id`)
	if err != nil {
		log.Fatalf("load blog posts: %v", err)
	}
	blogs := make([]blogRow, 0)
	for rows.Next() {
		var blog blogRow
		if err := rows.Scan(&blog.ID, &blog.Slug, &blog.BodyHTML, &blog.BodyHTMLSource, &blog.CTALabel, &blog.CTAText, &blog.CTAURL); err != nil {
			rows.Close()
			log.Fatalf("scan blog post: %v", err)
		}
		blogs = append(blogs, blog)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		log.Fatalf("iterate blog posts: %v", err)
	}
	rows.Close()

	changedPosts := 0
	rewriteCount := 0
	filteredLinkCount := 0
	reviewedLinkCount := 0
	for _, blog := range blogs {
		productLinks, err := blogcontent.CountProductLinks(blog.BodyHTML)
		if err != nil {
			log.Fatalf("count %s product links: %v", blog.Slug, err)
		}
		reviewedLinkCount += productLinks
		if blog.CTAURL == "/products" {
			reviewedLinkCount++
		}
		bodyHTML, bodyRewrites, err := blogcontent.RewriteProductLinks(blog.BodyHTML, products)
		if err != nil {
			log.Fatalf("rewrite %s body_html: %v", blog.Slug, err)
		}
		bodySource, sourceRewrites, err := blogcontent.RewriteProductLinks(blog.BodyHTMLSource, products)
		if err != nil {
			log.Fatalf("rewrite %s body_html_source: %v", blog.Slug, err)
		}
		ctaURL, ctaMatches := blogcontent.RewriteProductCTA(blog.CTALabel, blog.CTAText, blog.CTAURL, products)

		if len(bodyRewrites) == 0 {
			bodyHTML = blog.BodyHTML
		}
		if len(sourceRewrites) == 0 {
			bodySource = blog.BodyHTMLSource
		}
		if len(bodyRewrites) == 0 && len(sourceRewrites) == 0 && ctaURL == blog.CTAURL {
			continue
		}
		validations, err := blogcontent.ValidateProductLinks(bodyHTML, products)
		if err != nil {
			log.Fatalf("validate %s body links: %v", blog.Slug, err)
		}
		filteredLinkCount += len(validations)

		result, err := tx.Exec(ctx, `UPDATE blog_posts
			SET body_html=$2, body_html_source=$3, body_json='{}'::jsonb, cta_url=$4
			WHERE id=$1`, blog.ID, bodyHTML, bodySource, ctaURL)
		if err != nil {
			log.Fatalf("update %s: %v", blog.Slug, err)
		}
		if result.RowsAffected() != 1 {
			log.Fatalf("update %s affected %d rows", blog.Slug, result.RowsAffected())
		}
		changedPosts++
		rewriteCount += len(bodyRewrites) + len(sourceRewrites)
		for _, rewrite := range bodyRewrites {
			fmt.Printf("%s | %q | %s -> %s | %d results\n", blog.Slug, rewrite.AnchorText, rewrite.OldURL, rewrite.NewURL, rewrite.Matches)
		}
		if ctaURL != blog.CTAURL {
			fmt.Printf("%s | CTA %q | %s -> %s | %d results\n", blog.Slug, blog.CTALabel, blog.CTAURL, ctaURL, ctaMatches)
		}
	}

	if *apply {
		if err := tx.Commit(ctx); err != nil {
			log.Fatalf("commit link corrections: %v", err)
		}
		log.Printf("applied: %d product links reviewed, %d posts changed, %d HTML copies rewritten, %d filtered links validated", reviewedLinkCount, changedPosts, rewriteCount, filteredLinkCount)
		return
	}
	if err := tx.Rollback(ctx); err != nil {
		log.Fatalf("rollback dry-run: %v", err)
	}
	log.Printf("dry-run only: %d product links reviewed, %d posts would change, %d HTML copies would be rewritten, %d filtered links validated", reviewedLinkCount, changedPosts, rewriteCount, filteredLinkCount)
}
