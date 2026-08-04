package blogcontent

import (
	"strings"
	"testing"
)

func TestProcessSanitizesUnsafeHTMLAndBuildsTOC(t *testing.T) {
	result, err := Process(`<h1>نباید بماند</h1><h2 class="bad">عنوان</h2><p onclick="bad()">متن فارسی برای آزمون <a href="javascript:alert(1)">لینک</a></p><img src="/safe.jpg" onerror="bad()" alt="تصویر"><script>alert(1)</script>`)
	if err != nil {
		t.Fatal(err)
	}
	for _, forbidden := range []string{"<h1", "script", "onclick", "onerror", "javascript:", `class=`} {
		if strings.Contains(strings.ToLower(result.HTML), forbidden) {
			t.Fatalf("unsafe value %q survived: %s", forbidden, result.HTML)
		}
	}
	if !strings.Contains(result.HTML, `id="section-1"`) || len(result.TableOfContents) != 1 {
		t.Fatalf("expected generated TOC and heading id: %#v %s", result.TableOfContents, result.HTML)
	}
}

func TestProcessAddsSafeExternalLinkAttributes(t *testing.T) {
	result, err := Process(`<p><a href="https://example.com/page">منبع</a></p>`)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(result.HTML, `target="_blank"`) || !strings.Contains(result.HTML, `rel="noopener noreferrer"`) {
		t.Fatalf("external link was not normalized: %s", result.HTML)
	}
}

func TestProcessWarnsWhenImageDimensionsAreMissing(t *testing.T) {
	result, err := Process(`<p><img src="/image.jpg" alt="گل پارچه‌ای"></p>`)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(strings.Join(result.Warnings, " "), "width یا height") {
		t.Fatalf("missing dimensions warning was not generated: %#v", result.Warnings)
	}
}
