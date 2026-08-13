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

func TestProductSchemaIncludesVisibleStructuredSpecifications(t *testing.T) {
	diameter := 18.0
	schema := productSchema("https://golmelo.com", models.Product{
		Slug:        "kerisheh-flower",
		Title:       "گل کریشه ساتن",
		Description: "گل پارچه‌ای برای لباس مجلسی",
		UseCases:    []string{"evening_dress"},
		Techniques:  []string{"kerisheh", "three_dimensional"},
		Materials:   []string{"satin"},
		Colors:      []string{"ivory"},
		DiameterCM:  &diameter,
	})
	if schema["size"] != "قطر 18 سانتی‌متر" {
		t.Fatalf("expected product diameter in schema, got %#v", schema["size"])
	}
	if schema["material"] != "ساتن" || schema["color"] != "شیری" {
		t.Fatalf("expected single merchant-listing values for material and color, got %#v / %#v", schema["material"], schema["color"])
	}
	if _, exists := schema["category"]; exists {
		t.Fatalf("expected custom product category to be omitted from merchant listing, got %#v", schema["category"])
	}
	properties, ok := schema["additionalProperty"].([]map[string]any)
	if !ok || len(properties) != 4 {
		t.Fatalf("expected use case, technique, diameter and jewelry embroidery properties, got %#v", schema["additionalProperty"])
	}
}

func TestProductSchemaJoinsMultipleMaterialsAndColors(t *testing.T) {
	schema := productSchema("https://golmelo.com", models.Product{
		ID: "product-flower", Slug: "flower", Title: "گل",
		Materials: []string{"chiffon", "satin"}, Colors: []string{"white", "pink"},
		BasePriceRial: 8_000_000,
	})
	if schema["material"] != "حریر، ساتن" || schema["color"] != "سفید، صورتی" {
		t.Fatalf("expected joined merchant values, got %#v / %#v", schema["material"], schema["color"])
	}
	offer := schema["offers"].(map[string]any)
	if offer["itemCondition"] != "https://schema.org/NewCondition" {
		t.Fatalf("expected new product condition, got %#v", offer["itemCondition"])
	}
}

func TestProductSchemaIncludesJewelryEmbroideryStatus(t *testing.T) {
	schema := productSchema("https://golmelo.com", models.Product{
		Slug:                 "embellished-flower",
		Title:                "گل جواهردوزی‌شده",
		HasJewelryEmbroidery: true,
	})
	properties, ok := schema["additionalProperty"].([]map[string]any)
	if !ok {
		t.Fatalf("expected product properties, got %#v", schema["additionalProperty"])
	}
	for _, property := range properties {
		if property["name"] == "جواهردوزی" && property["value"] == "دارد" {
			return
		}
	}
	t.Fatalf("expected jewelry embroidery status in schema, got %#v", properties)
}

func TestProductSchemaIncludesAllGalleryImages(t *testing.T) {
	schema := productSchema("https://golmelo.com", models.Product{
		Slug:  "gallery-flower",
		Title: "گل چندتصویری",
		Images: []models.ProductImage{
			{ID: "cover", URL: "https://golmelo.com/cover.webp"},
			{ID: "detail", URL: "https://golmelo.com/detail.webp"},
		},
	})
	images, ok := schema["image"].([]string)
	if !ok || len(images) != 2 || images[0] != "https://golmelo.com/cover.webp" || images[1] != "https://golmelo.com/detail.webp" {
		t.Fatalf("expected all product gallery images in schema, got %#v", schema["image"])
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
