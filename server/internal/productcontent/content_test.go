package productcontent

import "testing"

func TestManifestIsCompleteAndValid(t *testing.T) {
	entries, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 22 {
		t.Fatalf("expected 22 entries, got %d", len(entries))
	}
}
