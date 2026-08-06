package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"
	"time"

	"melody-server/internal/blogcontent"
	"melody-server/internal/media"
	"melody-server/internal/models"
	"melody-server/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
)

type blogPublicationBody struct {
	Status                  string     `json:"status" binding:"required"`
	ScheduledFor            *time.Time `json:"scheduledFor"`
	ScheduledForTehranLocal string     `json:"scheduledForTehranLocal"`
}

type blogPublishedAtBody struct {
	PublishedAtTehranLocal string `json:"publishedAtTehranLocal" binding:"required"`
}

type blogPreviewBody struct {
	BodyHTML string `json:"bodyHtml"`
}

type blogImageBody struct {
	Alt     string `json:"alt" binding:"max=240"`
	Caption string `json:"caption" binding:"max=500"`
}

func (h *Handler) ListBlogs(c *gin.Context) {
	c.Header("Cache-Control", "no-cache, max-age=0, must-revalidate")
	page := intQuery(c, "page", 1)
	limit := intQuery(c, "limit", 9)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	list, err := h.blogs.ListPublic(ctx, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت مقالات انجام نشد."})
		return
	}
	h.attachBlogSummaryImages(ctx, list.Posts)
	c.JSON(http.StatusOK, list)
}

func (h *Handler) GetBlog(c *gin.Context) {
	c.Header("Cache-Control", "no-cache, max-age=0, must-revalidate")
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	post, redirected, err := h.blogs.GetPublic(ctx, c.Param("slug"))
	if errors.Is(err, repository.ErrBlogGone) {
		c.JSON(http.StatusGone, gin.H{"error": "این مقاله آرشیو شده است."})
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "مقاله پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت مقاله انجام نشد."})
		return
	}
	if redirected {
		c.Redirect(http.StatusMovedPermanently, "/api/v1/blogs/"+post.Slug)
		return
	}
	h.prepareBlogPost(ctx, &post)
	post.BodyHTMLSource = ""
	post.BodyJSON = nil
	c.JSON(http.StatusOK, gin.H{"post": post})
}

func (h *Handler) ListAdminBlogs(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	posts, err := h.blogs.ListAdmin(ctx, c.Query("search"), c.Query("status"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت فهرست مقالات انجام نشد."})
		return
	}
	h.attachBlogSummaryImages(ctx, posts)
	c.JSON(http.StatusOK, gin.H{"posts": posts})
}

func (h *Handler) GetAdminBlog(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	post, err := h.blogs.GetAdmin(ctx, c.Param("id"))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "مقاله پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت مقاله انجام نشد."})
		return
	}
	h.prepareBlogPost(ctx, &post)
	c.JSON(http.StatusOK, gin.H{"post": post})
}

func (h *Handler) CreateAdminBlog(c *gin.Context) {
	var post models.BlogPost
	if err := c.ShouldBindJSON(&post); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "اطلاعات مقاله معتبر نیست."})
		return
	}
	if err := processBlogHTML(&post); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "HTML مقاله معتبر نیست."})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	created, err := h.blogs.Create(ctx, post)
	if err != nil {
		h.writeBlogMutationError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"post": created})
}

func (h *Handler) UpdateAdminBlog(c *gin.Context) {
	var post models.BlogPost
	if err := c.ShouldBindJSON(&post); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "اطلاعات مقاله معتبر نیست."})
		return
	}
	if err := processBlogHTML(&post); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "HTML مقاله معتبر نیست."})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	updated, err := h.blogs.Update(ctx, c.Param("id"), post)
	if err != nil {
		h.writeBlogMutationError(c, err)
		return
	}
	h.prepareBlogPost(ctx, &updated)
	c.JSON(http.StatusOK, gin.H{"post": updated})
}

func (h *Handler) DeleteAdminBlog(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	err := h.blogs.Delete(ctx, c.Param("id"))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "مقاله پیدا نشد."})
		return
	}
	if errors.Is(err, repository.ErrCannotDelete) {
		c.JSON(http.StatusConflict, gin.H{"error": "مقاله منتشرشده حذف دائمی نمی‌شود؛ آن را آرشیو کنید."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "حذف مقاله انجام نشد."})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) UpdateAdminBlogPublication(c *gin.Context) {
	var body blogPublicationBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "وضعیت انتشار معتبر نیست."})
		return
	}
	if body.Status == "scheduled" && strings.TrimSpace(body.ScheduledForTehranLocal) != "" {
		parsed, err := parseTehranPublicationTime(body.ScheduledForTehranLocal)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "تاریخ و ساعت شمسی انتخاب‌شده معتبر نیست."})
			return
		}
		body.ScheduledFor = &parsed
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	post, err := h.blogs.SetPublication(ctx, c.Param("id"), body.Status, body.ScheduledFor)
	if err != nil {
		h.writeBlogMutationError(c, err)
		return
	}
	h.prepareBlogPost(ctx, &post)
	c.JSON(http.StatusOK, gin.H{"post": post})
}

func (h *Handler) UpdateAdminBlogPublishedAt(c *gin.Context) {
	var body blogPublishedAtBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "تاریخ انتشار معتبر نیست."})
		return
	}
	publishedAt, err := parseTehranPublicationTime(body.PublishedAtTehranLocal)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "تاریخ انتشار معتبر نیست."})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	post, err := h.blogs.UpdatePublishedAt(ctx, c.Param("id"), publishedAt)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "مقاله پیدا نشد."})
		return
	}
	if errors.Is(err, repository.ErrInvalidPublish) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "تاریخ انتشار فقط برای مقاله منتشرشده و تا زمان فعلی قابل اصلاح است."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "اصلاح تاریخ انتشار انجام نشد."})
		return
	}
	h.prepareBlogPost(ctx, &post)
	c.JSON(http.StatusOK, gin.H{"post": post})
}

func (h *Handler) PreviewAdminBlog(c *gin.Context) {
	c.Header("X-Robots-Tag", "noindex, nofollow, noarchive")
	c.Header("Cache-Control", "private, no-store")
	var body blogPreviewBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "HTML مقاله معتبر نیست."})
		return
	}
	result, err := blogcontent.Process(body.BodyHTML)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ساخت پیش‌نمایش انجام نشد."})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) ListAdminBlogCategories(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	categories, err := h.blogs.ListCategories(ctx, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت دسته‌بندی‌ها انجام نشد."})
		return
	}
	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

func (h *Handler) CreateAdminBlogCategory(c *gin.Context) {
	h.saveBlogCategory(c, "")
}

func (h *Handler) UpdateAdminBlogCategory(c *gin.Context) {
	h.saveBlogCategory(c, c.Param("id"))
}

func (h *Handler) saveBlogCategory(c *gin.Context, id string) {
	var category models.BlogCategory
	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "دسته‌بندی معتبر نیست."})
		return
	}
	category.ID = id
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	saved, err := h.blogs.SaveCategory(ctx, category)
	if err != nil {
		h.writeBlogMutationError(c, err)
		return
	}
	status := http.StatusOK
	if id == "" {
		status = http.StatusCreated
	}
	c.JSON(status, gin.H{"category": saved})
}

func (h *Handler) DeleteAdminBlogCategory(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	if err := h.blogs.DeleteCategory(ctx, c.Param("id")); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "دسته‌بندی پیدا نشد."})
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "حذف دسته‌بندی انجام نشد."})
	} else {
		c.Status(http.StatusNoContent)
	}
}

func (h *Handler) ListAdminBlogImages(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	images, err := h.blogs.ListImages(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصاویر مقاله انجام نشد."})
		return
	}
	h.attachBlogImages(ctx, images)
	c.JSON(http.StatusOK, gin.H{"images": images})
}

func (h *Handler) UploadAdminBlogImages(c *gin.Context) {
	if err := c.Request.ParseMultipartForm(64 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "فایل تصویر معتبر نیست."})
		return
	}
	files := uploadedFiles(c.Request.MultipartForm)
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "حداقل یک تصویر انتخاب کنید."})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Minute)
	defer cancel()
	if _, err := h.blogs.GetAdmin(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ابتدا مقاله را ذخیره کنید."})
		return
	}
	images := make([]models.BlogImage, 0, len(files))
	for index, file := range files {
		image, err := h.createBlogImage(ctx, c.Param("id"), file, index)
		if err != nil {
			if len(images) > 0 {
				h.attachBlogImages(ctx, images)
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "images": images})
			return
		}
		images = append(images, image)
	}
	h.attachBlogImages(ctx, images)
	c.JSON(http.StatusCreated, gin.H{"images": images})
}

func (h *Handler) UpdateAdminBlogImage(c *gin.Context) {
	var body blogImageBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "اطلاعات تصویر معتبر نیست."})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	image, err := h.blogs.UpdateImage(ctx, c.Param("id"), c.Param("imageId"), body.Alt, body.Caption)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "تصویر پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ویرایش تصویر انجام نشد."})
		return
	}
	images := []models.BlogImage{image}
	h.attachBlogImages(ctx, images)
	c.JSON(http.StatusOK, gin.H{"image": images[0]})
}

func (h *Handler) DeleteAdminBlogImage(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	imageID := c.Param("imageId")
	if err := h.variants.DeleteForSource(ctx, blogImagesTable, imageID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "حذف نسخه‌های تصویر انجام نشد."})
		return
	}
	if err := h.blogs.DeleteImage(ctx, c.Param("id"), imageID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "تصویر پیدا نشد."})
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "حذف تصویر انجام نشد."})
	} else {
		c.Status(http.StatusNoContent)
	}
}

func (h *Handler) GetBlogImageContent(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	image, err := h.blogs.GetImage(ctx, c.Param("id"), true)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "تصویر پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصویر انجام نشد."})
		return
	}
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=%q", image.Filename))
	c.Data(http.StatusOK, image.ContentType, image.Data)
}

func (h *Handler) StartBlogScheduler() {
	go func() {
		reconcile := func() {
			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()
			if _, err := h.blogs.ReconcileScheduled(ctx); err != nil {
				log.Printf("blog publication reconciler: %v", err)
			}
		}
		reconcile()
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			reconcile()
		}
	}()
}

func processBlogHTML(post *models.BlogPost) error {
	source := post.BodyHTMLSource
	if strings.TrimSpace(source) == "" {
		source = post.BodyHTML
	}
	result, err := blogcontent.Process(source)
	if err != nil {
		return err
	}
	post.BodyHTMLSource = source
	post.BodyHTML = result.HTML
	post.TableOfContents = result.TableOfContents
	post.ReadingTimeMinutes = result.ReadingTimeMinutes
	bodyJSON := strings.TrimSpace(string(post.BodyJSON))
	if bodyJSON == "" || bodyJSON == "null" || bodyJSON == "{}" {
		post.BodyJSON = json.RawMessage(`{}`)
		return nil
	}
	var document struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(post.BodyJSON, &document); err != nil || document.Type != "doc" {
		return fmt.Errorf("invalid editor document")
	}
	return nil
}

func (h *Handler) prepareBlogPost(ctx context.Context, post *models.BlogPost) {
	result, _ := blogcontent.Process(post.BodyHTML)
	post.TableOfContents = result.TableOfContents
	post.ReadingTimeMinutes = result.ReadingTimeMinutes
	if post.ScheduledFor != nil {
		if location, err := time.LoadLocation("Asia/Tehran"); err == nil {
			post.ScheduledForTehran = post.ScheduledFor.In(location).Format("2006-01-02 15:04")
		}
	}
	if post.CoverImageID != "" {
		post.CoverImageURL = h.blogImageURL(post.CoverImageID)
		post.CoverImageSources = h.imageSources(ctx, blogImagesTable, post.CoverImageID)
	}
	if post.OGImageID != "" {
		post.OGImageURL = h.blogOGImageURL(ctx, post.OGImageID)
	}
	h.attachBlogSummaryImages(ctx, post.RelatedPosts)
}

func (h *Handler) attachBlogSummaryImages(ctx context.Context, posts []models.BlogPostSummary) {
	ids := make([]string, 0, len(posts))
	for _, post := range posts {
		if post.CoverImageID != "" {
			ids = append(ids, post.CoverImageID)
		}
	}
	variants, _ := h.variants.ListForSources(ctx, blogImagesTable, ids)
	for index := range posts {
		if posts[index].CoverImageID == "" {
			continue
		}
		posts[index].CoverImageURL = h.blogImageURL(posts[index].CoverImageID)
		posts[index].CoverImageSources = h.variantSources(variants[posts[index].CoverImageID])
	}
}

func (h *Handler) attachBlogImages(ctx context.Context, images []models.BlogImage) {
	ids := make([]string, 0, len(images))
	for _, image := range images {
		ids = append(ids, image.ID)
	}
	variants, _ := h.variants.ListForSources(ctx, blogImagesTable, ids)
	for index := range images {
		images[index].URL = h.blogImageURL(images[index].ID)
		images[index].Sources = h.variantSources(variants[images[index].ID])
		images[index].OGURL = h.blogOGImageURL(ctx, images[index].ID)
	}
}

func (h *Handler) createBlogImage(ctx context.Context, blogID string, header *multipart.FileHeader, sortOrder int) (models.BlogImage, error) {
	if header.Size > media.MaxBlogImageBytes {
		return models.BlogImage{}, fmt.Errorf("حجم هر تصویر مقاله باید حداکثر ۸ مگابایت باشد.")
	}
	file, err := header.Open()
	if err != nil {
		return models.BlogImage{}, fmt.Errorf("خواندن تصویر انجام نشد.")
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, media.MaxBlogImageBytes+1))
	if err != nil {
		return models.BlogImage{}, fmt.Errorf("خواندن تصویر انجام نشد.")
	}
	validated, err := media.ValidateBlogImage(data)
	if err != nil {
		return models.BlogImage{}, err
	}
	id := generateID()
	image, err := h.blogs.CreateImage(ctx, models.BlogImage{ID: id, BlogID: blogID, Filename: id + validated.Extension, Alt: "تصویر مقاله", ContentType: validated.ContentType, Data: validated.Data, Width: validated.Width, Height: validated.Height, SortOrder: sortOrder})
	if err != nil {
		return models.BlogImage{}, err
	}
	if _, err := h.variants.ReplaceBlog(ctx, blogImagesTable, image.ID, validated.Data); err != nil {
		_ = h.blogs.DeleteImage(ctx, blogID, image.ID)
		return models.BlogImage{}, fmt.Errorf("ساخت نسخه‌های بهینه تصویر انجام نشد: %w", err)
	}
	return image, nil
}

func (h *Handler) blogImageURL(id string) string {
	return fmt.Sprintf("%s/api/v1/blog-images/%s/content", strings.TrimRight(h.cfg.App.BaseURL, "/"), id)
}

func (h *Handler) blogOGImageURL(ctx context.Context, id string) string {
	variant, err := h.variants.GetForSourceKey(ctx, blogImagesTable, id, "og")
	if err != nil {
		return h.blogImageURL(id)
	}
	return h.imageVariantURL(variant.ID)
}

func parseTehranPublicationTime(value string) (time.Time, error) {
	location, err := time.LoadLocation("Asia/Tehran")
	if err != nil {
		return time.Time{}, err
	}
	return time.ParseInLocation("2006-01-02 15:04", strings.TrimSpace(value), location)
}

func (h *Handler) writeBlogMutationError(c *gin.Context, err error) {
	var pgErr *pgconn.PgError
	switch {
	case errors.Is(err, repository.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "مقاله پیدا نشد."})
	case errors.Is(err, repository.ErrInvalidBlog):
		c.JSON(http.StatusBadRequest, gin.H{"error": "عنوان، slug یا اطلاعات مقاله معتبر نیست."})
	case errors.Is(err, repository.ErrInvalidPublish):
		c.JSON(http.StatusBadRequest, gin.H{"error": "برای انتشار، متن و خلاصه معتبر لازم است؛ در صورت انتخاب تصویر شاخص، alt آن نیز باید تکمیل شود و زمان‌بندی باید در آینده باشد."})
	case errors.As(err, &pgErr) && pgErr.Code == "23505":
		c.JSON(http.StatusConflict, gin.H{"error": "slug یا نام واردشده قبلاً استفاده شده است."})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ذخیره تغییرات انجام نشد."})
	}
}

func intQuery(c *gin.Context, key string, fallback int) int {
	value, err := strconv.Atoi(c.Query(key))
	if err != nil {
		return fallback
	}
	return value
}
