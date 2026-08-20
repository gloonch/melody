package productcontent

import (
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"
)

//go:embed manifest.json
var manifestData []byte

type Entry struct {
	Slug             string   `json:"slug"`
	Title            string   `json:"title"`
	ShortDescription string   `json:"shortDescription"`
	Description      string   `json:"description"`
	SEOTitle         string   `json:"seoTitle"`
	SEODescription   string   `json:"seoDescription"`
	RelatedBlogSlugs []string `json:"relatedBlogSlugs"`
}

func Load() ([]Entry, error) {
	var entries []Entry
	if err := json.Unmarshal(manifestData, &entries); err != nil {
		return nil, fmt.Errorf("decode product content manifest: %w", err)
	}
	if err := Validate(entries); err != nil {
		return nil, err
	}
	return entries, nil
}

func Validate(entries []Entry) error {
	if len(entries) != 22 {
		return fmt.Errorf("product content manifest must contain 22 entries, got %d", len(entries))
	}
	seenSlugs := make(map[string]struct{}, len(entries))
	seenShort := make(map[string]string, len(entries))
	seenDescription := make(map[string]string, len(entries))
	seenSEOTitle := make(map[string]string, len(entries))
	seenSEO := make(map[string]string, len(entries))
	blogLinkCounts := make(map[string]int)
	for _, entry := range entries {
		entry.Slug = strings.TrimSpace(entry.Slug)
		entry.Title = strings.TrimSpace(entry.Title)
		if entry.Slug == "" || entry.Title == "" {
			return errors.New("product content slug and title are required")
		}
		if _, exists := seenSlugs[entry.Slug]; exists {
			return fmt.Errorf("duplicate product slug %s", entry.Slug)
		}
		seenSlugs[entry.Slug] = struct{}{}
		if count := utf8.RuneCountInString(entry.ShortDescription); count < 80 || count > 170 {
			return fmt.Errorf("%s short description length is %d", entry.Slug, count)
		}
		if count := utf8.RuneCountInString(entry.Description); count < 180 || count > 420 {
			return fmt.Errorf("%s description length is %d", entry.Slug, count)
		}
		if count := utf8.RuneCountInString(entry.SEOTitle); count < 30 || count > 70 {
			return fmt.Errorf("%s SEO title length is %d", entry.Slug, count)
		}
		if count := utf8.RuneCountInString(entry.SEODescription); count < 110 || count > 180 {
			return fmt.Errorf("%s SEO description length is %d", entry.Slug, count)
		}
		if previous, exists := seenShort[entry.ShortDescription]; exists {
			return fmt.Errorf("%s duplicates short description of %s", entry.Slug, previous)
		}
		if previous, exists := seenDescription[entry.Description]; exists {
			return fmt.Errorf("%s duplicates description of %s", entry.Slug, previous)
		}
		if previous, exists := seenSEOTitle[entry.SEOTitle]; exists {
			return fmt.Errorf("%s duplicates SEO title of %s", entry.Slug, previous)
		}
		if previous, exists := seenSEO[entry.SEODescription]; exists {
			return fmt.Errorf("%s duplicates SEO description of %s", entry.Slug, previous)
		}
		seenShort[entry.ShortDescription] = entry.Slug
		seenDescription[entry.Description] = entry.Slug
		seenSEOTitle[entry.SEOTitle] = entry.Slug
		seenSEO[entry.SEODescription] = entry.Slug
		if len(entry.RelatedBlogSlugs) > 3 {
			return fmt.Errorf("%s has more than three related blogs", entry.Slug)
		}
		seenBlogs := make(map[string]struct{}, len(entry.RelatedBlogSlugs))
		for _, blogSlug := range entry.RelatedBlogSlugs {
			blogSlug = strings.TrimSpace(blogSlug)
			if blogSlug == "" {
				return fmt.Errorf("%s has an empty related blog slug", entry.Slug)
			}
			if _, exists := seenBlogs[blogSlug]; exists {
				return fmt.Errorf("%s repeats related blog %s", entry.Slug, blogSlug)
			}
			seenBlogs[blogSlug] = struct{}{}
			blogLinkCounts[blogSlug]++
			if blogLinkCounts[blogSlug] > 3 {
				return fmt.Errorf("related blog %s is assigned to more than three products", blogSlug)
			}
		}
	}
	return nil
}
