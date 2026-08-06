package repository

import (
	"errors"
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

func TestValidateBlogForPublicationAllowsMissingCover(t *testing.T) {
	called := false
	err := validateBlogForPublication(models.BlogPost{Excerpt: "خلاصه", BodyHTML: "<p>متن</p>"}, func() (bool, error) {
		called = true
		return false, nil
	})
	if err != nil {
		t.Fatalf("expected coverless article to be publishable: %v", err)
	}
	if called {
		t.Fatal("cover ownership must not be queried when no cover is selected")
	}
}

func TestValidateBlogForPublicationRejectsIncompleteCover(t *testing.T) {
	post := models.BlogPost{Excerpt: "خلاصه", BodyHTML: "<p>متن</p>", CoverImageID: "image-1"}
	if err := validateBlogForPublication(post, func() (bool, error) { return true, nil }); !errors.Is(err, ErrInvalidPublish) {
		t.Fatalf("expected incomplete cover to be rejected, got %v", err)
	}
}

func TestValidateBlogForPublicationRejectsAnotherPostsCover(t *testing.T) {
	post := models.BlogPost{Excerpt: "خلاصه", BodyHTML: "<p>متن</p>", CoverImageID: "image-1", CoverImageAlt: "گل پارچه‌ای"}
	if err := validateBlogForPublication(post, func() (bool, error) { return false, nil }); !errors.Is(err, ErrInvalidPublish) {
		t.Fatalf("expected another post's cover to be rejected, got %v", err)
	}
}

func TestValidatePublishedAtChange(t *testing.T) {
	now := time.Date(2026, 8, 6, 12, 0, 0, 0, time.UTC)
	original := now.Add(-24 * time.Hour)
	published := models.BlogPost{Status: "published", PublishedAt: &original}

	for _, value := range []time.Time{now.Add(-48 * time.Hour), now} {
		if err := validatePublishedAtChange(published, value, now); err != nil {
			t.Fatalf("expected %s to be accepted: %v", value, err)
		}
	}
	if err := validatePublishedAtChange(published, now.Add(time.Second), now); !errors.Is(err, ErrInvalidPublish) {
		t.Fatalf("expected a future publication date to be rejected, got %v", err)
	}

	for _, status := range []string{"draft", "scheduled", "archived"} {
		post := models.BlogPost{Status: status, PublishedAt: &original}
		if err := validatePublishedAtChange(post, original, now); !errors.Is(err, ErrInvalidPublish) {
			t.Fatalf("expected status %q to be rejected, got %v", status, err)
		}
	}
	if err := validatePublishedAtChange(models.BlogPost{Status: "published"}, original, now); !errors.Is(err, ErrInvalidPublish) {
		t.Fatalf("expected missing original publication date to be rejected, got %v", err)
	}
}
