package httpapi

import (
	"encoding/xml"
	"strings"
	"testing"

	"melody-server/internal/models"
)

func TestRenderSEOHeadEscapesUserManagedMetadata(t *testing.T) {
	head := renderSEOHead(siteMetadata{
		Title:       `گل <ویژه>`,
		Description: `توضیح "محصول"`,
		Canonical:   "https://golmelo.com/products/test",
		Image:       "https://golmelo.com/image.png",
		PageType:    "product",
		Robots:      "index, follow",
	})
	if strings.Contains(head, "<ویژه>") {
		t.Fatal("expected title markup to be escaped")
	}
	if !strings.Contains(head, "https://golmelo.com/products/test") {
		t.Fatal("expected canonical URL in rendered head")
	}
}

func TestRenderSEOHeadIncludesResponsiveHeroPreload(t *testing.T) {
	head := renderSEOHead(siteMetadata{
		Title:          "گلملو",
		Description:    "آتلیه گلملو",
		Canonical:      "https://golmelo.com/",
		Image:          "https://golmelo.com/og-image.png",
		PageType:       "website",
		Robots:         "index, follow",
		PreloadImage:   "https://golmelo.com/api/v1/hero-slides/1/content",
		PreloadSources: []models.ImageSource{{URL: "https://golmelo.com/api/v1/image-variants/1/content", Width: 480, Type: "image/webp"}},
	})
	if !strings.Contains(head, `rel="preload" as="image"`) || !strings.Contains(head, `480w`) {
		t.Fatalf("expected responsive hero preload, got %s", head)
	}
}

func TestRenderSEOHeadMarksStructuredDataForSPAReconciliation(t *testing.T) {
	head := renderSEOHead(siteMetadata{
		Title: "گلملو", Description: "آتلیه گلملو", Canonical: "https://golmelo.com/products/flower",
		Image: "https://golmelo.com/og-image.png", PageType: "product", Robots: "index, follow",
		JSONLD: []any{map[string]any{"@context": "https://schema.org", "@type": "Product", "name": "گل"}},
	})
	if !strings.Contains(head, `id="golmelo-product-jsonld"`) || !strings.Contains(head, `data-seo-shell="true"`) {
		t.Fatalf("expected server schema to be identifiable by the SPA, got %s", head)
	}
}

func TestProductSchemaDoesNotInventOfferWithoutPrice(t *testing.T) {
	schema := productSchema("https://golmelo.com", models.Product{Slug: "flower", Title: "گل", Description: "توضیح"})
	if _, exists := schema["offers"]; exists {
		t.Fatal("expected no Offer when numeric price is missing")
	}
}

func TestProductSchemaUsesRealIRRPrice(t *testing.T) {
	schema := productSchema("https://golmelo.com", models.Product{
		Slug:          "flower",
		Title:         "گل",
		Description:   "توضیح",
		BasePriceRial: 15_000_000,
		PriceCurrency: "IRR",
		Availability:  "in_stock",
	})
	offer, ok := schema["offers"].(map[string]any)
	if !ok {
		t.Fatal("expected Offer for a product with a numeric price")
	}
	if offer["price"] != int64(15_000_000) || offer["priceCurrency"] != "IRR" {
		t.Fatalf("unexpected offer: %#v", offer)
	}
}

func TestNotFoundMetadataIsNotIndexable(t *testing.T) {
	meta := notFoundMetadata("https://golmelo.com", "https://golmelo.com/og-image.png")
	if meta.Robots != "noindex, nofollow" || meta.Canonical != "https://golmelo.com/not-found" {
		t.Fatalf("unexpected 404 metadata: %#v", meta)
	}
}

func TestSitemapDocumentUsesStandardNamespaceAndLastMod(t *testing.T) {
	document := sitemapDocument{
		Xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
		URLs:  []sitemapURL{{Loc: "https://golmelo.com/products/flower", LastMod: "2026-08-02"}},
	}
	data, err := xml.Marshal(document)
	if err != nil {
		t.Fatal(err)
	}
	value := string(data)
	if !strings.Contains(value, `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`) || !strings.Contains(value, "<lastmod>2026-08-02</lastmod>") {
		t.Fatalf("unexpected sitemap XML: %s", value)
	}
	if strings.Contains(value, "priority") || strings.Contains(value, "changefreq") {
		t.Fatalf("sitemap should not contain priority or changefreq: %s", value)
	}
}

func TestCourseRequestTypeMatchesCourseState(t *testing.T) {
	tests := []struct {
		status      string
		requestType string
		allowed     bool
	}{
		{"recording", "notification", true},
		{"in_production", "notification", true},
		{"for_sale", "purchase", true},
		{"sold_out", "waitlist", true},
		{"completed", "", false},
	}
	for _, test := range tests {
		requestType, allowed := courseRequestType(test.status)
		if requestType != test.requestType || allowed != test.allowed {
			t.Fatalf("unexpected request state for %s: %s, %v", test.status, requestType, allowed)
		}
	}
}
