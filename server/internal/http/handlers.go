package httpapi

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"

	"melody-server/internal/config"
	"melody-server/internal/database"
	"melody-server/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Handler struct {
	db  *database.MongoDB
	cfg *config.Config
}

const (
	contactMessageMinLength = 10
	contactMessageMaxLength = 2000
)

type createContactRequestBody struct {
	FullName string `json:"fullName" binding:"required,max=120"`
	Contact  string `json:"contact" binding:"required,max=32"`
	Message  string `json:"message" binding:"required"`
}

type createCourseSignupBody struct {
	Phone string `json:"phone" binding:"required,max=32"`
}

type adminLoginBody struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type contactRequestResponse struct {
	ID        string    `json:"id"`
	FullName  string    `json:"fullName"`
	Contact   string    `json:"contact"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"createdAt"`
}

type courseSignupResponse struct {
	ID        string    `json:"id"`
	Phone     string    `json:"phone"`
	CreatedAt time.Time `json:"createdAt"`
}

type projectImageResponse struct {
	ID          string `json:"id"`
	Alt         string `json:"alt"`
	Filename    string `json:"filename"`
	ContentType string `json:"contentType"`
	URL         string `json:"url"`
	SortOrder   int    `json:"sortOrder"`
}

type uploadImageResult struct {
	ID          string `json:"id"`
	Filename    string `json:"filename"`
	ContentType string `json:"contentType"`
	URL         string `json:"url"`
}

func NewHandler(db *database.MongoDB, cfg *config.Config) *Handler {
	return &Handler{db: db, cfg: cfg}
}

func (h *Handler) AdminLogin(c *gin.Context) {
	var body adminLoginBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "نام کاربری و رمز عبور الزامی است."})
		return
	}

	usernameMatch := subtle.ConstantTimeCompare([]byte(body.Username), []byte(h.cfg.Admin.Username)) == 1
	passwordMatch := subtle.ConstantTimeCompare([]byte(body.Password), []byte(h.cfg.Admin.Password)) == 1
	if !usernameMatch || !passwordMatch {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نام کاربری یا رمز عبور درست نیست."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": h.cfg.Admin.Token,
		"user": gin.H{
			"username": h.cfg.Admin.Username,
		},
	})
}

func (h *Handler) CreateContactRequest(c *gin.Context) {
	var body createContactRequestBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "اطلاعات فرم کامل نیست."})
		return
	}

	body.FullName = strings.TrimSpace(body.FullName)
	body.Contact = normalizeDigits(strings.TrimSpace(body.Contact))
	body.Message = strings.TrimSpace(body.Message)
	if body.FullName == "" || body.Contact == "" || body.Message == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "اطلاعات فرم کامل نیست."})
		return
	}
	if !isDigitsOnly(body.Contact) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "شماره تلفن باید فقط شامل عدد باشد."})
		return
	}

	messageLength := utf8.RuneCountInString(body.Message)
	if messageLength < contactMessageMinLength || messageLength > contactMessageMaxLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "طول متن پیام معتبر نیست."})
		return
	}

	now := time.Now().UTC()
	request := models.ContactRequest{
		ID:        primitive.NewObjectID(),
		FullName:  body.FullName,
		Contact:   body.Contact,
		Message:   body.Message,
		CreatedAt: now,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if _, err := h.db.ContactRequests().InsertOne(ctx, request); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ذخیره پیام انجام نشد."})
		return
	}

	c.JSON(http.StatusCreated, contactRequestResponse{
		ID:        request.ID.Hex(),
		FullName:  request.FullName,
		Contact:   request.Contact,
		Message:   request.Message,
		CreatedAt: request.CreatedAt,
	})
}

func (h *Handler) ListContactRequests(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	cursor, err := h.db.ContactRequests().Find(
		ctx,
		bson.D{},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت پیام‌ها انجام نشد."})
		return
	}
	defer cursor.Close(ctx)

	requests := make([]contactRequestResponse, 0)
	for cursor.Next(ctx) {
		var request models.ContactRequest
		if err := cursor.Decode(&request); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "خواندن پیام‌ها انجام نشد."})
			return
		}

		requests = append(requests, contactRequestResponse{
			ID:        request.ID.Hex(),
			FullName:  request.FullName,
			Contact:   request.Contact,
			Message:   request.Message,
			CreatedAt: request.CreatedAt,
		})
	}
	if err := cursor.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "خواندن پیام‌ها انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"contactRequests": requests})
}

func (h *Handler) CreateCourseSignup(c *gin.Context) {
	var body createCourseSignupBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "شماره تلفن الزامی است."})
		return
	}

	body.Phone = normalizeDigits(strings.TrimSpace(body.Phone))
	if !isDigitsOnly(body.Phone) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "شماره تلفن باید فقط شامل عدد باشد."})
		return
	}

	now := time.Now().UTC()
	signup := models.CourseSignup{
		ID:        primitive.NewObjectID(),
		Phone:     body.Phone,
		CreatedAt: now,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if _, err := h.db.CourseSignups().InsertOne(ctx, signup); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ثبت شماره انجام نشد."})
		return
	}

	c.JSON(http.StatusCreated, courseSignupResponse{
		ID:        signup.ID.Hex(),
		Phone:     signup.Phone,
		CreatedAt: signup.CreatedAt,
	})
}

func (h *Handler) ListCourseSignups(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	cursor, err := h.db.CourseSignups().Find(
		ctx,
		bson.D{},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت ثبت‌نام‌های دوره انجام نشد."})
		return
	}
	defer cursor.Close(ctx)

	signups := make([]courseSignupResponse, 0)
	for cursor.Next(ctx) {
		var signup models.CourseSignup
		if err := cursor.Decode(&signup); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "خواندن ثبت‌نام‌های دوره انجام نشد."})
			return
		}

		signups = append(signups, courseSignupResponse{
			ID:        signup.ID.Hex(),
			Phone:     signup.Phone,
			CreatedAt: signup.CreatedAt,
		})
	}
	if err := cursor.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "خواندن ثبت‌نام‌های دوره انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"courseSignups": signups})
}

func (h *Handler) ListProjectImages(c *gin.Context) {
	h.listImages(c, h.db.ProjectImages(), h.projectImageURL)
}

func (h *Handler) UploadProjectImages(c *gin.Context) {
	h.uploadImages(c, h.db.ProjectImages(), "نمونه‌کار", h.projectImageURL)
}

func (h *Handler) DeleteProjectImage(c *gin.Context) {
	h.deleteImage(c, h.db.ProjectImages())
}

func (h *Handler) ListHeroSlides(c *gin.Context) {
	h.listImages(c, h.db.HeroSlides(), h.heroSlideURL)
}

func (h *Handler) UploadHeroSlides(c *gin.Context) {
	h.uploadImages(c, h.db.HeroSlides(), "اسلاید", h.heroSlideURL)
}

func (h *Handler) DeleteHeroSlide(c *gin.Context) {
	h.deleteImage(c, h.db.HeroSlides())
}

func (h *Handler) listImages(c *gin.Context, collection *mongo.Collection, urlForID func(string) string) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	findOptions := options.Find().
		SetSort(bson.D{{Key: "sortOrder", Value: 1}, {Key: "filename", Value: 1}}).
		SetProjection(bson.M{"data": 0})

	cursor, err := collection.Find(ctx, bson.D{}, findOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصاویر انجام نشد."})
		return
	}
	defer cursor.Close(ctx)

	images := make([]projectImageResponse, 0)
	for cursor.Next(ctx) {
		var image models.ProjectImage
		if err := cursor.Decode(&image); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "خواندن تصاویر انجام نشد."})
			return
		}

		images = append(images, projectImageResponse{
			ID:          image.ID.Hex(),
			Alt:         image.Alt,
			Filename:    image.Filename,
			ContentType: image.ContentType,
			URL:         urlForID(image.ID.Hex()),
			SortOrder:   image.SortOrder,
		})
	}
	if err := cursor.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "خواندن تصاویر انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"images": images})
}

func (h *Handler) GetProjectImageContent(c *gin.Context) {
	h.getImageContent(c, h.db.ProjectImages())
}

func (h *Handler) GetHeroSlideContent(c *gin.Context) {
	h.getImageContent(c, h.db.HeroSlides())
}

func (h *Handler) getImageContent(c *gin.Context, collection *mongo.Collection) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "شناسه تصویر معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	var image models.ProjectImage
	err = collection.FindOne(ctx, bson.M{"_id": id}).Decode(&image)
	if errors.Is(err, mongo.ErrNoDocuments) {
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

func (h *Handler) uploadImages(c *gin.Context, collection *mongo.Collection, altPrefix string, urlForID func(string) string) {
	if err := c.Request.ParseMultipartForm(128 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "فایل‌های تصویر معتبر نیستند."})
		return
	}

	files := uploadedFiles(c.Request.MultipartForm)
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "حداقل یک تصویر انتخاب کنید."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	startOrder, err := nextSortOrder(ctx, collection)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "آماده‌سازی آپلود انجام نشد."})
		return
	}

	now := time.Now().UTC()
	documents := make([]interface{}, 0, len(files))
	uploaded := make([]uploadImageResult, 0, len(files))

	for index, header := range files {
		image, err := imageFromUploadHeader(header, fmt.Sprintf("%s %d", altPrefix, startOrder+index+1), startOrder+index, now)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		documents = append(documents, image)
		uploaded = append(uploaded, uploadImageResult{
			ID:          image.ID.Hex(),
			Filename:    image.Filename,
			ContentType: image.ContentType,
			URL:         urlForID(image.ID.Hex()),
		})
	}

	if _, err := collection.InsertMany(ctx, documents); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ذخیره تصاویر انجام نشد."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"images": uploaded})
}

func (h *Handler) deleteImage(c *gin.Context, collection *mongo.Collection) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "شناسه تصویر معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	result, err := collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "حذف تصویر انجام نشد."})
		return
	}
	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "تصویر پیدا نشد."})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) projectImageURL(id string) string {
	return fmt.Sprintf("%s/api/v1/images/%s/content", strings.TrimRight(h.cfg.App.BaseURL, "/"), id)
}

func (h *Handler) heroSlideURL(id string) string {
	return fmt.Sprintf("%s/api/v1/hero-slides/%s/content", strings.TrimRight(h.cfg.App.BaseURL, "/"), id)
}

func uploadedFiles(form *multipart.Form) []*multipart.FileHeader {
	if form == nil {
		return nil
	}

	fields := []string{"images", "image", "files", "file"}
	files := make([]*multipart.FileHeader, 0)
	for _, field := range fields {
		files = append(files, form.File[field]...)
	}
	return files
}

func imageFromUploadHeader(header *multipart.FileHeader, alt string, sortOrder int, createdAt time.Time) (models.ImageDocument, error) {
	file, err := header.Open()
	if err != nil {
		return models.ImageDocument{}, fmt.Errorf("خواندن تصویر انجام نشد.")
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return models.ImageDocument{}, fmt.Errorf("خواندن تصویر انجام نشد.")
	}
	if len(data) == 0 {
		return models.ImageDocument{}, fmt.Errorf("فایل تصویر خالی است.")
	}

	contentType := http.DetectContentType(data)
	if !strings.HasPrefix(contentType, "image/") {
		return models.ImageDocument{}, fmt.Errorf("فقط فایل تصویر قابل آپلود است.")
	}

	id := primitive.NewObjectID()
	filename := id.Hex() + "-" + filepath.Base(header.Filename)

	return models.ImageDocument{
		ID:          id,
		Filename:    filename,
		Alt:         alt,
		ContentType: contentType,
		Data:        data,
		SortOrder:   sortOrder,
		CreatedAt:   createdAt,
	}, nil
}

func nextSortOrder(ctx context.Context, collection *mongo.Collection) (int, error) {
	options := options.FindOne().
		SetSort(bson.D{{Key: "sortOrder", Value: -1}}).
		SetProjection(bson.M{"sortOrder": 1})

	var row struct {
		SortOrder int `bson:"sortOrder"`
	}
	err := collection.FindOne(ctx, bson.D{}, options).Decode(&row)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return row.SortOrder + 1, nil
}

func normalizeDigits(value string) string {
	return strings.Map(func(r rune) rune {
		switch {
		case r >= '۰' && r <= '۹':
			return '0' + (r - '۰')
		case r >= '٠' && r <= '٩':
			return '0' + (r - '٠')
		default:
			return r
		}
	}, value)
}

func isDigitsOnly(value string) bool {
	if value == "" {
		return false
	}

	for _, r := range value {
		if r < '0' || r > '9' {
			return false
		}
	}

	return true
}
