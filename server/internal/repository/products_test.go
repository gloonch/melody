package repository

import (
	"strings"
	"testing"

	"melody-server/internal/models"
)

func validActiveProduct() models.Product {
	return models.Product{
		Slug:             "rose-brooch",
		Title:            "گل پارچه‌ای رز برای کت",
		Description:      "گل پارچه‌ای دست‌ساز مناسب یقه کت.",
		ShortDescription: "گل رز پارچه‌ای برای کت.",
		CoverImageID:     "image-1",
		UsageLabel:       "کت و مانتو",
		BasePriceRial:    12_000_000,
		PriceCurrency:    "IRR",
		Availability:     ProductAvailabilityInStock,
		PreparationDays:  1,
		Status:           ProductStatusActive,
	}
}

func TestValidateProductAllowsActiveProductWithoutPrice(t *testing.T) {
	product := validActiveProduct()
	product.BasePriceRial = 0
	if err := ValidateProduct(product); err != nil {
		t.Fatalf("expected an active product without a price to remain editable, got %v", err)
	}
}

func TestValidateProductRejectsNegativePrice(t *testing.T) {
	product := validActiveProduct()
	product.BasePriceRial = -1
	if err := ValidateProduct(product); err == nil {
		t.Fatal("expected a negative base price to be rejected")
	}
}

func TestValidateProductAllowsIncompleteDraft(t *testing.T) {
	product := models.Product{
		Slug: "draft-flower", Title: "پیش‌نویس گل", Status: ProductStatusDraft,
		PriceCurrency: "IRR", Availability: ProductAvailabilityInStock,
	}
	if err := ValidateProduct(product); err != nil {
		t.Fatalf("expected incomplete draft to remain editable, got %v", err)
	}
}

func TestValidateProductRejectsFeaturedDraft(t *testing.T) {
	product := models.Product{
		Slug: "draft-flower", Title: "پیش‌نویس گل", Status: ProductStatusDraft, IsFeatured: true,
		PriceCurrency: "IRR", Availability: ProductAvailabilityInStock,
	}
	if err := ValidateProduct(product); err == nil {
		t.Fatal("expected featured draft to be rejected")
	}
}

func TestValidateProductRejectsUnknownAvailability(t *testing.T) {
	product := validActiveProduct()
	product.Availability = "available_soon"
	if err := ValidateProduct(product); err == nil {
		t.Fatal("expected unknown availability to be rejected")
	}
}

func TestValidateProductAcceptsStructuredMetadata(t *testing.T) {
	diameter := 14.5
	product := validActiveProduct()
	product.UseCases = []string{"evening_dress", "coat_manto"}
	product.Techniques = []string{"kerisheh", "three_dimensional"}
	product.Materials = []string{"satin", "organza"}
	product.Colors = []string{"ivory", "pink"}
	product.Features = []string{"lightweight", "detachable"}
	product.AttachmentTypes = []string{"pin", "sewn"}
	product.DiameterCM = &diameter
	product.CustomizableColor = true
	product.CustomizableSize = true
	if err := ValidateProduct(product); err != nil {
		t.Fatalf("expected structured product metadata to be valid, got %v", err)
	}
}

func TestValidateProductRejectsUnknownFeatureAndAttachment(t *testing.T) {
	product := validActiveProduct()
	product.Features = []string{"washable"}
	if err := ValidateProduct(product); err == nil {
		t.Fatal("expected an unknown product feature to be rejected")
	}
	product.Features = nil
	product.AttachmentTypes = []string{"magnet"}
	if err := ValidateProduct(product); err == nil {
		t.Fatal("expected an unknown attachment type to be rejected")
	}
}

func TestValidateProductRejectsUnknownControlledValue(t *testing.T) {
	product := validActiveProduct()
	product.UseCases = []string{"evening_dress"}
	product.Techniques = []string{"unknown-technique"}
	if err := ValidateProduct(product); err == nil {
		t.Fatal("expected unknown technique to be rejected")
	}
}

func TestValidateProductRejectsNonPositiveDiameter(t *testing.T) {
	diameter := 0.0
	product := validActiveProduct()
	product.DiameterCM = &diameter
	if err := ValidateProduct(product); err == nil {
		t.Fatal("expected non-positive diameter to be rejected")
	}
}

func TestSeedQueryExcludesDeletedProjectImages(t *testing.T) {
	if !strings.Contains(seedProductsQuery, "product_seed_tombstones") {
		t.Fatal("product seed query must exclude intentionally deleted project images")
	}
}

func TestNormalizeProductDeduplicatesControlledValues(t *testing.T) {
	product := models.Product{
		UseCases:  []string{"hat", "hat", ""},
		Materials: []string{"satin", " satin ", ""},
		Colors:    nil,
	}
	normalizeProduct(&product)
	if len(product.UseCases) != 1 || product.UseCases[0] != "hat" {
		t.Fatalf("expected duplicate use cases to be removed, got %#v", product.UseCases)
	}
	if len(product.Materials) != 1 || product.Materials[0] != "satin" {
		t.Fatalf("expected duplicate materials to be removed, got %#v", product.Materials)
	}
	if product.Colors == nil {
		t.Fatal("expected nil colors to be normalized to an empty slice")
	}
}
