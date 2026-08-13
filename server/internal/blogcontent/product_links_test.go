package blogcontent

import (
	"strings"
	"testing"

	"melody-server/internal/models"
)

func testProduct(diameter float64) models.Product {
	return models.Product{
		Title:           "گل سینه مشکی",
		Techniques:      []string{"kerisheh", "three_dimensional"},
		Materials:       []string{"chiffon"},
		Colors:          []string{"black"},
		UseCases:        []string{"evening_dress", "wedding_dress"},
		AttachmentTypes: []string{"pin"},
		DiameterCM:      &diameter,
	}
}

func TestRewriteProductLinksCombinesSemanticFilters(t *testing.T) {
	products := []models.Product{testProduct(18)}
	output, rewrites, err := RewriteProductLinks(`<p><a href="/products">گل حریر لباس عروس</a></p>`, products)
	if err != nil {
		t.Fatal(err)
	}
	if len(rewrites) != 1 || rewrites[0].Matches != 1 {
		t.Fatalf("expected one validated rewrite, got %#v", rewrites)
	}
	if !strings.Contains(output, `href="/products#material=chiffon&amp;use=wedding-dress"`) {
		t.Fatalf("combined filter URL was not rendered: %s", output)
	}
}

func TestRewriteProductLinksKeepsUnavailableFeatureGeneral(t *testing.T) {
	products := []models.Product{testProduct(18)}
	output, rewrites, err := RewriteProductLinks(`<a href="/products">گل پارچه‌ای سبک و جداشونده</a>`, products)
	if err != nil {
		t.Fatal(err)
	}
	if len(rewrites) != 0 || !strings.Contains(output, `href="/products"`) {
		t.Fatalf("unavailable feature should keep the general catalog link: %s %#v", output, rewrites)
	}
}

func TestRewriteProductLinksCorrectsWrongSemanticDestinations(t *testing.T) {
	products := []models.Product{testProduct(18)}
	output, rewrites, err := RewriteProductLinks(`<a href="/products">ارسال عکس لباس</a><a href="/products">نمونه درس ویدئویی</a>`, products)
	if err != nil {
		t.Fatal(err)
	}
	if len(rewrites) != 2 || !strings.Contains(output, `href="/custom-order"`) || !strings.Contains(output, `href="/courses"`) {
		t.Fatalf("semantic destinations were not corrected: %s %#v", output, rewrites)
	}
}

func TestValidateProductLinkRejectsInvalidOrEmptyFilters(t *testing.T) {
	products := []models.Product{testProduct(18)}
	if count, err := ValidateProductLink(`/products#q=مشکی`, products); err != nil || count != 1 {
		t.Fatalf("Persian color search should match black metadata: count=%d err=%v", count, err)
	}
	if _, err := ValidateProductLink(`/products#attachment=magnet`, products); err == nil {
		t.Fatal("unknown attachment value should be rejected")
	}
	if count, err := ValidateProductLink(`/products#material=velvet`, products); err != nil || count != 0 {
		t.Fatalf("expected a valid empty filter result, count=%d err=%v", count, err)
	}
}
