package repository

import (
	"testing"

	"melody-server/internal/models"
)

func TestValidateCourseRequiresPriceWhenForSale(t *testing.T) {
	course := models.Course{Title: "دوره", Slug: "course", Status: "for_sale", PriceCurrency: "IRR"}
	if err := validateCourse(course); err == nil {
		t.Fatal("expected a for-sale course without a real price to be rejected")
	}
}

func TestValidateCourseRejectsUnknownStatus(t *testing.T) {
	course := models.Course{Title: "دوره", Slug: "course", Status: "soon", PriceCurrency: "IRR"}
	if err := validateCourse(course); err == nil {
		t.Fatal("expected an unknown course status to be rejected")
	}
}
