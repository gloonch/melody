package repository

import (
	"errors"
	"testing"
)

func TestNormalizeRelatedIDsDeduplicatesAndLimits(t *testing.T) {
	values, err := normalizeRelatedIDs([]string{"one", " two ", "one", "three"})
	if err != nil {
		t.Fatal(err)
	}
	if len(values) != 3 || values[1] != "two" {
		t.Fatalf("unexpected normalized values: %#v", values)
	}
	if _, err := normalizeRelatedIDs([]string{"one", "two", "three", "four"}); !errors.Is(err, ErrTooManyRelatedItems) {
		t.Fatalf("expected relation limit error, got %v", err)
	}
}
