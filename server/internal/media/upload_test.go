package media

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"strings"
	"testing"
)

func TestValidateBlogImageAcceptsAndNormalizesPNG(t *testing.T) {
	var source bytes.Buffer
	input := image.NewRGBA(image.Rect(0, 0, 32, 24))
	input.Set(1, 1, color.RGBA{R: 200, G: 80, B: 90, A: 255})
	if err := png.Encode(&source, input); err != nil {
		t.Fatal(err)
	}
	result, err := ValidateBlogImage(source.Bytes())
	if err != nil {
		t.Fatal(err)
	}
	if result.ContentType != "image/png" || result.Extension != ".png" || result.Width != 32 || result.Height != 24 {
		t.Fatalf("unexpected image metadata: %#v", result)
	}
	if len(result.Data) == 0 {
		t.Fatal("normalized image is empty")
	}
}

func TestValidateBlogImageRejectsSVGAndOversizedPayload(t *testing.T) {
	if _, err := ValidateBlogImage([]byte(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`)); err == nil {
		t.Fatal("SVG must be rejected")
	}
	if _, err := ValidateBlogImage(bytes.Repeat([]byte{'x'}, MaxBlogImageBytes+1)); err == nil || !strings.Contains(err.Error(), "۸ مگابایت") {
		t.Fatalf("oversized image must be rejected: %v", err)
	}
}
