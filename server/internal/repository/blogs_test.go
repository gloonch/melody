package repository

import (
	"testing"
	"time"

	"melody-server/internal/models"
)

func TestValidateBlogSlug(t *testing.T) {
	valid := []string{"fabric-flower", "guide-2026", "abc"}
	for _, slug := range valid {
		if err := ValidateBlogSlug(slug); err != nil {
			t.Errorf("expected %q to be valid: %v", slug, err)
		}
	}
	invalid := []string{"ab", "Persian-Flower", "گل-پارچه", "double--dash", "space slug", "-start"}
	for _, slug := range invalid {
		if err := ValidateBlogSlug(slug); err == nil {
			t.Errorf("expected %q to be invalid", slug)
		}
	}
}

func TestEffectivePublicationBoundary(t *testing.T) {
	now := time.Date(2026, 8, 4, 12, 0, 0, 0, time.UTC)
	due := now
	future := now.Add(time.Second)
	if !isEffectivePublished(models.BlogPost{Status: "scheduled", ScheduledFor: &due}, now) {
		t.Fatal("scheduled post must be visible at its exact database boundary")
	}
	if isEffectivePublished(models.BlogPost{Status: "scheduled", ScheduledFor: &future}, now) {
		t.Fatal("future scheduled post must remain hidden")
	}
	if !isEffectivePublished(models.BlogPost{Status: "published", PublishedAt: &due}, now) {
		t.Fatal("published post must be visible")
	}
}
