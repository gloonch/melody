package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"melody-server/internal/models"

	"github.com/gin-gonic/gin"
)

func TestProcessBlogHTMLAcceptsTiptapDocument(t *testing.T) {
	post := models.BlogPost{
		BodyHTMLSource: `<h2>عنوان بخش</h2><p>متن مقاله</p>`,
		BodyJSON:       json.RawMessage(`{"type":"doc","content":[{"type":"paragraph"}]}`),
	}
	if err := processBlogHTML(&post); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(post.BodyHTML, "<h2") || post.ReadingTimeMinutes != 1 {
		t.Fatalf("editor content was not processed: %+v", post)
	}
}

func TestProcessBlogHTMLRejectsInvalidEditorDocument(t *testing.T) {
	post := models.BlogPost{BodyHTMLSource: `<p>متن مقاله</p>`, BodyJSON: json.RawMessage(`{"type":"not-a-document"}`)}
	if err := processBlogHTML(&post); err == nil {
		t.Fatal("expected invalid editor JSON to be rejected")
	}
}

func TestParseTehranPublicationTimeUsesTehranRegardlessOfHostTimezone(t *testing.T) {
	parsed, err := parseTehranPublicationTime("2026-08-04 18:30")
	if err != nil {
		t.Fatal(err)
	}
	if got := parsed.UTC().Format(time.RFC3339); got != "2026-08-04T15:00:00Z" {
		t.Fatalf("unexpected UTC schedule: %s", got)
	}
}

func TestAdminPreviewIsProtectedNoStoreAndSanitized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	handler := &Handler{}
	router.POST("/preview", adminPrivateMiddleware(), adminAuthMiddleware("test-admin-token"), handler.PreviewAdminBlog)

	unauthorized := httptest.NewRecorder()
	router.ServeHTTP(unauthorized, httptest.NewRequest(http.MethodPost, "/preview", strings.NewReader(`{"bodyHtml":"<p>text</p>"}`)))
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("expected unauthorized preview, got %d", unauthorized.Code)
	}

	request := httptest.NewRequest(http.MethodPost, "/preview", strings.NewReader(`{"bodyHtml":"<h2>عنوان</h2><script>alert(1)</script><p>متن</p>"}`))
	request.Header.Set("Authorization", "Bearer test-admin-token")
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("preview failed: %d %s", response.Code, response.Body.String())
	}
	if response.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("preview cache policy is unsafe: %q", response.Header().Get("Cache-Control"))
	}
	if response.Header().Get("X-Robots-Tag") != "noindex, nofollow, noarchive" {
		t.Fatalf("preview robots policy is unsafe: %q", response.Header().Get("X-Robots-Tag"))
	}
	if strings.Contains(response.Body.String(), "script") {
		t.Fatalf("unsafe preview HTML survived: %s", response.Body.String())
	}
}
