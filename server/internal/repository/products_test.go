package repository

import (
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

func TestValidateProductRejectsActiveProductWithoutPrice(t *testing.T) {
	product := validActiveProduct()
	product.BasePriceRial = 0
	if err := ValidateProduct(product); err == nil {
		t.Fatal("expected active product without a real base price to be rejected")
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
