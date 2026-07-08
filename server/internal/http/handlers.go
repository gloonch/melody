package httpapi

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
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
	"melody-server/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	db        *database.PostgresDB
	cfg       *config.Config
	courses   *repository.CourseRepository
	products  *repository.ProductRepository
	orders    *repository.OrderRepository
	addresses *repository.AddressRepository
	users     *repository.UserRepository
}

const (
	contactMessageMinLength = 10
	contactMessageMaxLength = 2000

	projectImagesTable = "project_images"
	heroSlidesTable    = "hero_slides"
)

type createContactRequestBody struct {
	FullName string `json:"fullName" binding:"required,max=120"`
	Contact  string `json:"contact" binding:"required,max=32"`
	Message  string `json:"message" binding:"required"`
}

type createCourseSignupBody struct {
	Phone       string `json:"phone" binding:"required,max=32"`
	CourseID    string `json:"courseId" binding:"max=120"`
	CourseSlug  string `json:"courseSlug" binding:"max=180"`
	CourseTitle string `json:"courseTitle" binding:"max=240"`
}

type adminLoginBody struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type authCredentialsBody struct {
	Phone    string `json:"phone" binding:"required,max=32"`
	Password string `json:"password" binding:"required,min=6,max=128"`
}

type updateMeBody struct {
	Email           string `json:"email" binding:"max=180"`
	FullName        string `json:"fullName" binding:"max=160"`
	FirstName       string `json:"firstName" binding:"max=80"`
	LastName        string `json:"lastName" binding:"max=80"`
	Phone           string `json:"phone" binding:"max=32"`
	BirthDate       string `json:"birthDate" binding:"max=32"`
	Instagram       string `json:"instagram" binding:"max=120"`
	Website         string `json:"website" binding:"max=180"`
	NewPassword     string `json:"newPassword" binding:"max=128"`
	RepeatPassword  string `json:"repeatPassword" binding:"max=128"`
	CurrentPassword string `json:"currentPassword" binding:"max=128"`
}

type createOrderBody struct {
	Type              string `json:"type" binding:"max=40"`
	ProductID         string `json:"productId" binding:"max=120"`
	Status            string `json:"status" binding:"max=40"`
	Usage             string `json:"usage" binding:"max=180"`
	UsageOtherText    string `json:"usageOtherText" binding:"max=180"`
	PreferredColor    string `json:"preferredColor" binding:"max=120"`
	StyleNote         string `json:"styleNote" binding:"max=240"`
	Quantity          int    `json:"quantity"`
	NeededBy          string `json:"neededBy" binding:"max=80"`
	CustomerNote      string `json:"customerNote" binding:"max=1200"`
	DeliveryAddressID string `json:"deliveryAddressId" binding:"max=120"`
}

type updateOrderStatusBody struct {
	Status    string `json:"status" binding:"required,max=40"`
	AdminNote string `json:"adminNote" binding:"max=1200"`
}

type addressBody struct {
	Title         string   `json:"title" binding:"required,max=120"`
	FullAddress   string   `json:"fullAddress" binding:"required,max=1200"`
	ReceiverName  string   `json:"receiverName" binding:"max=160"`
	ReceiverPhone string   `json:"receiverPhone" binding:"max=32"`
	IsDefault     bool     `json:"isDefault"`
	Lat           *float64 `json:"lat"`
	Lng           *float64 `json:"lng"`
	MapProvider   string   `json:"mapProvider" binding:"max=80"`
	PlaceID       string   `json:"placeId" binding:"max=180"`
	PostalCode    string   `json:"postalCode" binding:"max=32"`
	City          string   `json:"city" binding:"max=120"`
	Province      string   `json:"province" binding:"max=120"`
}

type contactRequestResponse struct {
	ID        string    `json:"id"`
	FullName  string    `json:"fullName"`
	Contact   string    `json:"contact"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"createdAt"`
}

type courseSignupResponse struct {
	ID          string    `json:"id"`
	Phone       string    `json:"phone"`
	CourseID    string    `json:"courseId"`
	CourseSlug  string    `json:"courseSlug"`
	CourseTitle string    `json:"courseTitle"`
	CreatedAt   time.Time `json:"createdAt"`
}

type courseAccessBody struct {
	Phone string `json:"phone" binding:"required,max=32"`
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

type courseWithImagesResponse struct {
	Course models.Course        `json:"course"`
	Images []models.CourseImage `json:"images"`
}

func NewHandler(db *database.PostgresDB, cfg *config.Config) *Handler {
	return &Handler{
		db:        db,
		cfg:       cfg,
		courses:   repository.NewCourseRepository(db.Pool()),
		products:  repository.NewProductRepository(db.Pool()),
		orders:    repository.NewOrderRepository(db.Pool()),
		addresses: repository.NewAddressRepository(db.Pool()),
		users:     repository.NewUserRepository(db.Pool()),
	}
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

func (h *Handler) Signup(c *gin.Context) {
	var body authCredentialsBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "شماره تلفن و رمز عبور معتبر وارد کنید."})
		return
	}

	phone, err := normalizePhone(body.Phone)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	password := strings.TrimSpace(body.Password)
	if len(password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "رمز عبور باید حداقل ۶ کاراکتر باشد."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if _, err := h.users.GetByPhone(ctx, phone); err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "این شماره قبلاً ثبت شده است."})
		return
	} else if !errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "بررسی شماره تلفن انجام نشد."})
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ساخت حساب انجام نشد."})
		return
	}

	user, err := h.users.CreateUser(ctx, models.User{
		Phone:        phone,
		PasswordHash: string(passwordHash),
		FullName:     "کاربر گلملو",
		FirstName:    "کاربر",
		Role:         "user",
	})
	if err != nil {
		if isUniqueViolation(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "این شماره قبلاً ثبت شده است."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ساخت حساب انجام نشد."})
		return
	}

	if err := h.issueAuthSession(c, ctx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ورود به حساب انجام نشد."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"user": user})
}

func (h *Handler) Login(c *gin.Context) {
	var body authCredentialsBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "شماره تلفن و رمز عبور معتبر وارد کنید."})
		return
	}

	phone, err := normalizePhone(body.Phone)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	user, err := h.users.GetByPhone(ctx, phone)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "شماره تلفن یا رمز عبور درست نیست."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ورود انجام نشد."})
		return
	}
	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "حساب کاربری غیرفعال است."})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "شماره تلفن یا رمز عبور درست نیست."})
		return
	}

	if err := h.users.UpdateLastLogin(ctx, user.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ورود انجام نشد."})
		return
	}
	user, _ = h.users.GetByID(ctx, user.ID)

	if err := h.issueAuthSession(c, ctx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ورود انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

func (h *Handler) Logout(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if err := h.users.DeleteRefreshTokensForUser(ctx, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "خروج از حساب انجام نشد."})
		return
	}
	clearAuthCookies(c, h.cfg.Auth.CookieSecure)
	c.Status(http.StatusNoContent)
}

func (h *Handler) Refresh(c *gin.Context) {
	refreshToken, err := c.Cookie(refreshTokenCookieName)
	if err != nil || strings.TrimSpace(refreshToken) == "" {
		clearAuthCookies(c, h.cfg.Auth.CookieSecure)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست قابل تمدید نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	storedToken, err := h.users.GetRefreshTokenByHash(ctx, hashRefreshToken(refreshToken))
	if errors.Is(err, repository.ErrNotFound) {
		clearAuthCookies(c, h.cfg.Auth.CookieSecure)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست قابل تمدید نیست."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "تمدید نشست انجام نشد."})
		return
	}
	if storedToken.RevokedAt != nil || time.Now().UTC().After(storedToken.ExpiresAt) {
		clearAuthCookies(c, h.cfg.Auth.CookieSecure)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست منقضی شده است."})
		return
	}

	user, err := h.users.GetByID(ctx, storedToken.UserID)
	if err != nil || !user.IsActive {
		clearAuthCookies(c, h.cfg.Auth.CookieSecure)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	if err := h.users.RevokeRefreshToken(ctx, storedToken.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "تمدید نشست انجام نشد."})
		return
	}
	if err := h.issueAuthSession(c, ctx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "تمدید نشست انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

func (h *Handler) Session(c *gin.Context) {
	token, err := c.Cookie(accessTokenCookieName)
	if err != nil || strings.TrimSpace(token) == "" {
		c.JSON(http.StatusOK, gin.H{"authenticated": false, "user": nil})
		return
	}

	claims, err := validateAccessToken(h.cfg.Auth, token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"authenticated": false, "user": nil})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	user, err := h.users.GetByID(ctx, claims.Subject)
	if err != nil || !user.IsActive {
		c.JSON(http.StatusOK, gin.H{"authenticated": false, "user": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"authenticated": true, "user": user})
}

func (h *Handler) GetMe(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	user, err := h.users.GetByID(ctx, userID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "کاربر پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت اطلاعات کاربر انجام نشد."})
		return
	}
	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "حساب کاربری غیرفعال است."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

func (h *Handler) UpdateMe(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	var body updateMeBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "اطلاعات پروفایل معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	currentUser, err := h.users.GetByID(ctx, userID)
	if err != nil || !currentUser.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	phone := currentUser.Phone
	if strings.TrimSpace(body.Phone) != "" {
		phone, err = normalizePhone(body.Phone)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	firstName := strings.TrimSpace(body.FirstName)
	lastName := strings.TrimSpace(body.LastName)
	fullName := strings.TrimSpace(body.FullName)
	if fullName == "" {
		fullName = strings.TrimSpace(strings.Join([]string{firstName, lastName}, " "))
	}
	if fullName == "" {
		fullName = currentUser.FullName
	}

	updated, err := h.users.UpdateProfile(ctx, userID, repository.UserProfileUpdate{
		Email:     body.Email,
		FullName:  fullName,
		FirstName: firstName,
		LastName:  lastName,
		Phone:     phone,
		BirthDate: body.BirthDate,
		Instagram: body.Instagram,
		Website:   body.Website,
	})
	if err != nil {
		if isUniqueViolation(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "این شماره تلفن یا ایمیل قبلاً ثبت شده است."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ذخیره پروفایل انجام نشد."})
		return
	}

	newPassword := strings.TrimSpace(body.NewPassword)
	if newPassword != "" || strings.TrimSpace(body.RepeatPassword) != "" {
		if len(newPassword) < 6 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "رمز عبور جدید باید حداقل ۶ کاراکتر باشد."})
			return
		}
		if newPassword != strings.TrimSpace(body.RepeatPassword) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "تکرار رمز عبور با رمز جدید یکسان نیست."})
			return
		}
		passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ذخیره رمز عبور انجام نشد."})
			return
		}
		if err := h.users.UpdatePassword(ctx, userID, string(passwordHash)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ذخیره رمز عبور انجام نشد."})
			return
		}
		updated, _ = h.users.GetByID(ctx, userID)
	}

	c.JSON(http.StatusOK, gin.H{"user": updated})
}

func (h *Handler) ListAddresses(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	addresses, err := h.addresses.ListByUser(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت آدرس‌ها انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"addresses": addresses})
}

func (h *Handler) CreateAddress(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	var body addressBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "عنوان و متن آدرس الزامی است."})
		return
	}

	address := addressFromBody(userID, body)
	if address.Title == "" || address.FullAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "عنوان و متن آدرس الزامی است."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	created, err := h.addresses.Create(ctx, address)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ذخیره آدرس انجام نشد."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"address": created})
}

func (h *Handler) UpdateAddress(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	var body addressBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "عنوان و متن آدرس الزامی است."})
		return
	}

	address := addressFromBody(userID, body)
	if address.Title == "" || address.FullAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "عنوان و متن آدرس الزامی است."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	updated, err := h.addresses.Update(ctx, userID, strings.TrimSpace(c.Param("id")), address)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "آدرس پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ویرایش آدرس انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"address": updated})
}

func (h *Handler) DeleteAddress(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err := h.addresses.Delete(ctx, userID, strings.TrimSpace(c.Param("id")))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "آدرس پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "حذف آدرس انجام نشد."})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) SetDefaultAddress(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	address, err := h.addresses.SetDefault(ctx, userID, strings.TrimSpace(c.Param("id")))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "آدرس پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "انتخاب آدرس پیش‌فرض انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"address": address})
}

func (h *Handler) issueAuthSession(c *gin.Context, ctx context.Context, user models.User) error {
	accessToken, err := createAccessToken(h.cfg.Auth, user.ID, user.Role)
	if err != nil {
		return err
	}

	refreshToken, err := generateSecureToken()
	if err != nil {
		return err
	}

	refreshDuration := time.Duration(h.cfg.Auth.RefreshTokenDays) * 24 * time.Hour
	if _, err := h.users.CreateRefreshToken(ctx, models.RefreshToken{
		UserID:    user.ID,
		TokenHash: hashRefreshToken(refreshToken),
		ExpiresAt: time.Now().UTC().Add(refreshDuration),
	}); err != nil {
		return err
	}

	accessDuration := time.Duration(h.cfg.Auth.AccessTokenMinutes) * time.Minute
	setCookie(c, accessTokenCookieName, accessToken, authCookieMaxAge(accessDuration), h.cfg.Auth.CookieSecure)
	setCookie(c, refreshTokenCookieName, refreshToken, authCookieMaxAge(refreshDuration), h.cfg.Auth.CookieSecure)
	return nil
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
		ID:        generateID(),
		FullName:  body.FullName,
		Contact:   body.Contact,
		Message:   body.Message,
		CreatedAt: now,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	_, err := h.db.Pool().Exec(
		ctx,
		`INSERT INTO contact_requests (id, full_name, contact, message, created_at) VALUES ($1, $2, $3, $4, $5)`,
		request.ID,
		request.FullName,
		request.Contact,
		request.Message,
		request.CreatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ذخیره پیام انجام نشد."})
		return
	}

	c.JSON(http.StatusCreated, contactRequestResponse{
		ID:        request.ID,
		FullName:  request.FullName,
		Contact:   request.Contact,
		Message:   request.Message,
		CreatedAt: request.CreatedAt,
	})
}

func (h *Handler) ListContactRequests(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	rows, err := h.db.Pool().Query(
		ctx,
		`SELECT id, full_name, contact, message, created_at FROM contact_requests ORDER BY created_at DESC`,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت پیام‌ها انجام نشد."})
		return
	}
	defer rows.Close()

	requests := make([]contactRequestResponse, 0)
	for rows.Next() {
		var request contactRequestResponse
		if err := rows.Scan(&request.ID, &request.FullName, &request.Contact, &request.Message, &request.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "خواندن پیام‌ها انجام نشد."})
			return
		}
		requests = append(requests, request)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "خواندن پیام‌ها انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"contactRequests": requests})
}

func (h *Handler) DeleteContactRequest(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "شناسه پیام معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	result, err := h.db.Pool().Exec(ctx, `DELETE FROM contact_requests WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "حذف پیام انجام نشد."})
		return
	}
	if result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "پیام پیدا نشد."})
		return
	}

	c.Status(http.StatusNoContent)
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
		ID:          generateID(),
		Phone:       body.Phone,
		CourseID:    strings.TrimSpace(body.CourseID),
		CourseSlug:  strings.TrimSpace(body.CourseSlug),
		CourseTitle: strings.TrimSpace(body.CourseTitle),
		CreatedAt:   now,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	_, err := h.db.Pool().Exec(
		ctx,
		`INSERT INTO course_signups (id, phone, course_id, course_slug, course_title, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		signup.ID,
		signup.Phone,
		signup.CourseID,
		signup.CourseSlug,
		signup.CourseTitle,
		signup.CreatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ثبت شماره انجام نشد."})
		return
	}

	c.JSON(http.StatusCreated, courseSignupResponse{
		ID:          signup.ID,
		Phone:       signup.Phone,
		CourseID:    signup.CourseID,
		CourseSlug:  signup.CourseSlug,
		CourseTitle: signup.CourseTitle,
		CreatedAt:   signup.CreatedAt,
	})
}

func (h *Handler) ListCourseSignups(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	rows, err := h.db.Pool().Query(
		ctx,
		`SELECT id, phone, course_id, course_slug, course_title, created_at FROM course_signups ORDER BY created_at DESC`,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت ثبت‌نام‌های دوره انجام نشد."})
		return
	}
	defer rows.Close()

	signups := make([]courseSignupResponse, 0)
	for rows.Next() {
		var signup courseSignupResponse
		if err := rows.Scan(&signup.ID, &signup.Phone, &signup.CourseID, &signup.CourseSlug, &signup.CourseTitle, &signup.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "خواندن ثبت‌نام‌های دوره انجام نشد."})
			return
		}
		signups = append(signups, signup)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "خواندن ثبت‌نام‌های دوره انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"courseSignups": signups})
}

func (h *Handler) DeleteCourseSignup(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "شناسه ثبت‌نام معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	result, err := h.db.Pool().Exec(ctx, `DELETE FROM course_signups WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "حذف ثبت‌نام انجام نشد."})
		return
	}
	if result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "ثبت‌نام پیدا نشد."})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) ListCourses(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	courses, err := h.courses.ListCourses(ctx, false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت دوره‌ها انجام نشد."})
		return
	}
	if err := h.attachCourseImagesToList(ctx, courses); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصاویر دوره‌ها انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"courses": courses})
}

func (h *Handler) GetCourse(c *gin.Context) {
	h.getCourse(c, false)
}

func (h *Handler) ListAdminCourses(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	courses, err := h.courses.ListCourses(ctx, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت دوره‌ها انجام نشد."})
		return
	}
	if err := h.attachCourseImagesToList(ctx, courses); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصاویر دوره‌ها انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"courses": courses})
}

func (h *Handler) GetAdminCourse(c *gin.Context) {
	h.getCourse(c, true)
}

func (h *Handler) ListMyCourseAccesses(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	courseAccessIds, err := h.courses.ListAccessIDsByUser(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت دسترسی دوره‌ها انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"courseAccessIds": courseAccessIds})
}

func (h *Handler) ListAdminCourseAccesses(c *gin.Context) {
	courseID := strings.TrimSpace(c.Param("id"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	course, err := h.courses.GetCourse(ctx, courseID, true)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "دوره پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت دوره انجام نشد."})
		return
	}

	accesses, err := h.courses.ListAccesses(ctx, course.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت دسترسی‌ها انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"accesses": accesses})
}

func (h *Handler) GrantAdminCourseAccess(c *gin.Context) {
	courseID := strings.TrimSpace(c.Param("id"))

	var body courseAccessBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "شماره تلفن کاربر الزامی است."})
		return
	}

	phone, err := normalizePhone(body.Phone)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	course, err := h.courses.GetCourse(ctx, courseID, true)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "دوره پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت دوره انجام نشد."})
		return
	}

	user, err := h.users.GetByPhone(ctx, phone)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "کاربری با این شماره پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت کاربر انجام نشد."})
		return
	}

	access, err := h.courses.GrantAccess(ctx, course.ID, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ثبت دسترسی دوره انجام نشد."})
		return
	}
	access.UserName = user.FullName
	access.UserPhone = user.Phone

	c.JSON(http.StatusCreated, gin.H{"access": access})
}

func (h *Handler) RevokeAdminCourseAccess(c *gin.Context) {
	courseID := strings.TrimSpace(c.Param("id"))
	accessID := strings.TrimSpace(c.Param("accessId"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	course, err := h.courses.GetCourse(ctx, courseID, true)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "دوره پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت دوره انجام نشد."})
		return
	}

	err = h.courses.RevokeAccess(ctx, course.ID, accessID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "دسترسی پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "حذف دسترسی انجام نشد."})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) ListProducts(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	products, err := h.products.ListProducts(ctx, false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت محصولات انجام نشد."})
		return
	}
	h.attachProductImageURLs(products)

	c.JSON(http.StatusOK, gin.H{"products": products})
}

func (h *Handler) GetProduct(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	product, err := h.products.GetProduct(ctx, strings.TrimSpace(c.Param("id")), false)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "محصول پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت محصول انجام نشد."})
		return
	}
	h.attachProductImageURL(&product)

	c.JSON(http.StatusOK, gin.H{"product": product})
}

func (h *Handler) ListOrders(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	orders, err := h.orders.ListOrdersByUser(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت سفارش‌ها انجام نشد."})
		return
	}
	if err := h.attachReferenceImagesToOrders(ctx, orders); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصاویر سفارش انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

func (h *Handler) GetOrder(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	order, err := h.orders.GetOrderByUser(ctx, userID, strings.TrimSpace(c.Param("id")))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "سفارش پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت سفارش انجام نشد."})
		return
	}
	if err := h.attachReferenceImagesToOrder(ctx, &order); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصاویر سفارش انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"order": order})
}

func (h *Handler) CreateOrder(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	var body createOrderBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "اطلاعات سفارش معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	order, err := h.orderFromBody(ctx, userID, body)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, repository.ErrNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	created, err := h.orders.CreateOrder(ctx, order)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ثبت سفارش انجام نشد."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"order": created})
}

func (h *Handler) UpdateOrder(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	var body createOrderBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "اطلاعات سفارش معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	order, err := h.orderFromBody(ctx, userID, body)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, repository.ErrNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	updated, err := h.orders.UpdateDraft(ctx, userID, strings.TrimSpace(c.Param("id")), order)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "پیش‌نویس پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "فقط پیش‌نویس‌ها قابل ویرایش هستند."})
		return
	}
	if err := h.attachReferenceImagesToOrder(ctx, &updated); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصاویر سفارش انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"order": updated})
}

func (h *Handler) SubmitOrder(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	current, err := h.orders.GetOrderByUser(ctx, userID, strings.TrimSpace(c.Param("id")))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "پیش‌نویس پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت پیش‌نویس انجام نشد."})
		return
	}
	if validationError := validateOrderForSubmit(current); validationError != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": validationError})
		return
	}

	order, err := h.orders.SubmitDraft(ctx, userID, current.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ثبت نهایی سفارش انجام نشد."})
		return
	}
	if err := h.attachReferenceImagesToOrder(ctx, &order); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصاویر سفارش انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"order": order})
}

func (h *Handler) DeleteOrder(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err := h.orders.DeleteDraft(ctx, userID, strings.TrimSpace(c.Param("id")))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "پیش‌نویس پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "حذف پیش‌نویس انجام نشد."})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) UploadOrderReferenceImages(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
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

	order, err := h.orders.GetOrderByUser(ctx, userID, strings.TrimSpace(c.Param("id")))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "سفارش پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت سفارش انجام نشد."})
		return
	}

	existing, err := h.orders.ListReferenceImages(ctx, order.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "آماده‌سازی آپلود انجام نشد."})
		return
	}
	if len(existing)+len(files) > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "حداکثر ۵ تصویر مرجع قابل آپلود است."})
		return
	}

	uploaded := make([]models.OrderReferenceImage, 0, len(files))
	for index, header := range files {
		imageDoc, err := referenceImageFromUploadHeader(header, len(existing)+index, time.Now().UTC())
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		image, err := h.orders.CreateReferenceImage(ctx, models.OrderReferenceImage{
			ID:          imageDoc.ID,
			OrderID:     order.ID,
			Filename:    imageDoc.Filename,
			ContentType: imageDoc.ContentType,
			Data:        imageDoc.Data,
			SortOrder:   imageDoc.SortOrder,
			CreatedAt:   imageDoc.CreatedAt,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ذخیره تصویر مرجع انجام نشد."})
			return
		}
		image.URL = h.orderReferenceImageURL(order.ID, image.ID)
		uploaded = append(uploaded, image)
	}

	c.JSON(http.StatusCreated, gin.H{"images": uploaded})
}

func (h *Handler) DeleteOrderReferenceImage(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err := h.orders.DeleteReferenceImageByUser(ctx, userID, strings.TrimSpace(c.Param("id")), strings.TrimSpace(c.Param("imageId")))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "تصویر پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "حذف تصویر انجام نشد."})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) GetOrderReferenceImageContent(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	image, err := h.orders.GetReferenceImageContentByUser(ctx, userID, strings.TrimSpace(c.Param("id")), strings.TrimSpace(c.Param("imageId")))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "تصویر پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصویر انجام نشد."})
		return
	}

	c.Header("Cache-Control", "private, max-age=3600")
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=%q", image.Filename))
	c.Data(http.StatusOK, image.ContentType, image.Data)
}

func (h *Handler) ListAdminOrders(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	orders, err := h.orders.ListAdminOrders(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت سفارش‌ها انجام نشد."})
		return
	}
	if err := h.attachReferenceImagesToOrders(ctx, orders); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصاویر سفارش انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

func (h *Handler) GetAdminOrder(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	order, err := h.orders.GetAdminOrder(ctx, strings.TrimSpace(c.Param("id")))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "سفارش پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت سفارش انجام نشد."})
		return
	}
	if err := h.attachReferenceImagesToOrder(ctx, &order); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصاویر سفارش انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"order": order})
}

func (h *Handler) UpdateAdminOrderStatus(c *gin.Context) {
	var body updateOrderStatusBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "وضعیت سفارش معتبر نیست."})
		return
	}

	status := strings.TrimSpace(body.Status)
	if !repository.IsValidOrderStatus(status) || status == "draft" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "وضعیت سفارش معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	order, err := h.orders.UpdateStatus(ctx, strings.TrimSpace(c.Param("id")), status, body.AdminNote)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "سفارش پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "به‌روزرسانی سفارش انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"order": order})
}

func (h *Handler) CreateAdminCourse(c *gin.Context) {
	var course models.Course
	if err := c.ShouldBindJSON(&course); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "اطلاعات دوره معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	created, err := h.courses.CreateCourse(ctx, course)
	if err != nil {
		if isUniqueViolation(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "شناسه یا آدرس دوره تکراری است."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ساخت دوره انجام نشد."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"course": created})
}

func (h *Handler) UpdateAdminCourse(c *gin.Context) {
	var course models.Course
	if err := c.ShouldBindJSON(&course); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "اطلاعات دوره معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	updated, err := h.courses.UpdateCourse(ctx, strings.TrimSpace(c.Param("id")), course)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "دوره پیدا نشد."})
		return
	}
	if err != nil {
		if isUniqueViolation(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "شناسه یا آدرس دوره تکراری است."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ویرایش دوره انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"course": updated})
}

func (h *Handler) DeleteAdminCourse(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	err := h.courses.DeleteCourse(ctx, strings.TrimSpace(c.Param("id")))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "دوره پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "حذف دوره انجام نشد."})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) ListCourseImages(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	course, err := h.courses.GetCourse(ctx, strings.TrimSpace(c.Param("id")), true)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "دوره پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت دوره انجام نشد."})
		return
	}

	images, err := h.courseImagesWithURLs(ctx, course.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصاویر دوره انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"images": images})
}

func (h *Handler) UploadCourseImages(c *gin.Context) {
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

	course, err := h.courses.GetCourse(ctx, strings.TrimSpace(c.Param("id")), true)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "دوره پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت دوره انجام نشد."})
		return
	}

	existing, err := h.courses.ListImages(ctx, course.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "آماده‌سازی آپلود انجام نشد."})
		return
	}

	uploaded := make([]models.CourseImage, 0, len(files))
	for index, header := range files {
		imageDoc, err := imageFromUploadHeader(header, fmt.Sprintf("تصویر دوره %d", len(existing)+index+1), len(existing)+index, time.Now().UTC())
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		image, err := h.courses.CreateImage(ctx, models.CourseImage{
			ID:          imageDoc.ID,
			CourseID:    course.ID,
			Filename:    imageDoc.Filename,
			Alt:         imageDoc.Alt,
			ContentType: imageDoc.ContentType,
			Data:        imageDoc.Data,
			SortOrder:   imageDoc.SortOrder,
			CreatedAt:   imageDoc.CreatedAt,
		})
		if err != nil {
			if isUniqueViolation(err) {
				c.JSON(http.StatusConflict, gin.H{"error": "تصویر تکراری است."})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ذخیره تصاویر دوره انجام نشد."})
			return
		}
		image.URL = h.courseImageURL(course.ID, image.ID)
		uploaded = append(uploaded, image)
	}

	c.JSON(http.StatusCreated, gin.H{"images": uploaded})
}

func (h *Handler) DeleteCourseImage(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	course, err := h.courses.GetCourse(ctx, strings.TrimSpace(c.Param("id")), true)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "دوره پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت دوره انجام نشد."})
		return
	}

	err = h.courses.DeleteImage(ctx, course.ID, strings.TrimSpace(c.Param("imageId")))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "تصویر پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "حذف تصویر دوره انجام نشد."})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) GetCourseImageContent(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	course, err := h.courses.GetCourse(ctx, strings.TrimSpace(c.Param("id")), true)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "دوره پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت دوره انجام نشد."})
		return
	}

	image, err := h.courses.GetImageContent(ctx, course.ID, strings.TrimSpace(c.Param("imageId")))
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

func (h *Handler) getCourse(c *gin.Context, includeDrafts bool) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	course, err := h.courses.GetCourse(ctx, strings.TrimSpace(c.Param("id")), includeDrafts)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "دوره پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت دوره انجام نشد."})
		return
	}

	images, err := h.courseImagesWithURLs(ctx, course.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصاویر دوره انجام نشد."})
		return
	}
	h.attachLessonImageURLs(&course, images)
	h.attachCourseImageURL(&course, images)

	c.JSON(http.StatusOK, courseWithImagesResponse{Course: course, Images: images})
}

func (h *Handler) ListProjectImages(c *gin.Context) {
	h.listImages(c, projectImagesTable, h.projectImageURL)
}

func (h *Handler) UploadProjectImages(c *gin.Context) {
	h.uploadImages(c, projectImagesTable, "نمونه‌کار", h.projectImageURL)
}

func (h *Handler) DeleteProjectImage(c *gin.Context) {
	h.deleteImage(c, projectImagesTable)
}

func (h *Handler) ListHeroSlides(c *gin.Context) {
	h.listImages(c, heroSlidesTable, h.heroSlideURL)
}

func (h *Handler) UploadHeroSlides(c *gin.Context) {
	h.uploadImages(c, heroSlidesTable, "اسلاید", h.heroSlideURL)
}

func (h *Handler) DeleteHeroSlide(c *gin.Context) {
	h.deleteImage(c, heroSlidesTable)
}

func (h *Handler) listImages(c *gin.Context, table string, urlForID func(string) string) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	query, err := imageListQuery(table)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "تنظیمات تصویر معتبر نیست."})
		return
	}

	rows, err := h.db.Pool().Query(ctx, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصاویر انجام نشد."})
		return
	}
	defer rows.Close()

	images := make([]projectImageResponse, 0)
	for rows.Next() {
		var image projectImageResponse
		if err := rows.Scan(&image.ID, &image.Alt, &image.Filename, &image.ContentType, &image.SortOrder); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "خواندن تصاویر انجام نشد."})
			return
		}
		image.URL = urlForID(image.ID)
		images = append(images, image)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "خواندن تصاویر انجام نشد."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"images": images})
}

func (h *Handler) GetProjectImageContent(c *gin.Context) {
	h.getImageContent(c, projectImagesTable)
}

func (h *Handler) GetHeroSlideContent(c *gin.Context) {
	h.getImageContent(c, heroSlidesTable)
}

func (h *Handler) getImageContent(c *gin.Context, table string) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "شناسه تصویر معتبر نیست."})
		return
	}

	query, err := imageContentQuery(table)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "تنظیمات تصویر معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	var filename string
	var contentType string
	var data []byte
	err = h.db.Pool().QueryRow(ctx, query, id).Scan(&filename, &contentType, &data)
	if errors.Is(err, pgx.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "تصویر پیدا نشد."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "دریافت تصویر انجام نشد."})
		return
	}

	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=%q", filename))
	c.Data(http.StatusOK, contentType, data)
}

func (h *Handler) uploadImages(c *gin.Context, table string, altPrefix string, urlForID func(string) string) {
	if err := c.Request.ParseMultipartForm(128 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "فایل‌های تصویر معتبر نیستند."})
		return
	}

	files := uploadedFiles(c.Request.MultipartForm)
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "حداقل یک تصویر انتخاب کنید."})
		return
	}

	insertQuery, err := imageInsertQuery(table)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "تنظیمات تصویر معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	startOrder, err := nextSortOrder(ctx, h.db.Pool(), table)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "آماده‌سازی آپلود انجام نشد."})
		return
	}

	now := time.Now().UTC()
	uploaded := make([]uploadImageResult, 0, len(files))

	tx, err := h.db.Pool().Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ذخیره تصاویر انجام نشد."})
		return
	}
	defer tx.Rollback(ctx)

	for index, header := range files {
		image, err := imageFromUploadHeader(header, fmt.Sprintf("%s %d", altPrefix, startOrder+index+1), startOrder+index, now)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		_, err = tx.Exec(
			ctx,
			insertQuery,
			image.ID,
			image.Filename,
			image.Alt,
			image.ContentType,
			image.Data,
			image.SortOrder,
			image.CreatedAt,
		)
		if err != nil {
			if isUniqueViolation(err) {
				c.JSON(http.StatusConflict, gin.H{"error": "تصویر تکراری است."})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ذخیره تصاویر انجام نشد."})
			return
		}

		uploaded = append(uploaded, uploadImageResult{
			ID:          image.ID,
			Filename:    image.Filename,
			ContentType: image.ContentType,
			URL:         urlForID(image.ID),
		})
	}

	if err := tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ذخیره تصاویر انجام نشد."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"images": uploaded})
}

func (h *Handler) deleteImage(c *gin.Context, table string) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "شناسه تصویر معتبر نیست."})
		return
	}

	query, err := imageDeleteQuery(table)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "تنظیمات تصویر معتبر نیست."})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	result, err := h.db.Pool().Exec(ctx, query, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "حذف تصویر انجام نشد."})
		return
	}
	if result.RowsAffected() == 0 {
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

func (h *Handler) courseImageURL(courseID string, imageID string) string {
	return fmt.Sprintf("%s/api/v1/courses/%s/images/%s/content", strings.TrimRight(h.cfg.App.BaseURL, "/"), courseID, imageID)
}

func (h *Handler) attachProductImageURLs(products []models.Product) {
	for index := range products {
		h.attachProductImageURL(&products[index])
	}
}

func (h *Handler) attachProductImageURL(product *models.Product) {
	if product.CoverImageID == "" {
		return
	}
	product.CoverImageURL = h.projectImageURL(product.CoverImageID)
}

func productSnapshot(product models.Product) models.ProductSnapshot {
	return models.ProductSnapshot{
		ID:               product.ID,
		Slug:             product.Slug,
		Title:            product.Title,
		ShortDescription: product.ShortDescription,
		CoverImageURL:    product.CoverImageURL,
		PriceLabel:       product.PriceLabel,
		PreparationTime:  product.PreparationTime,
	}
}

func addressFromBody(userID string, body addressBody) models.Address {
	return models.Address{
		UserID:        userID,
		Title:         strings.TrimSpace(body.Title),
		FullAddress:   strings.TrimSpace(body.FullAddress),
		ReceiverName:  strings.TrimSpace(body.ReceiverName),
		ReceiverPhone: normalizeDigits(strings.TrimSpace(body.ReceiverPhone)),
		IsDefault:     body.IsDefault,
		Lat:           body.Lat,
		Lng:           body.Lng,
		MapProvider:   strings.TrimSpace(body.MapProvider),
		PlaceID:       strings.TrimSpace(body.PlaceID),
		PostalCode:    strings.TrimSpace(body.PostalCode),
		City:          strings.TrimSpace(body.City),
		Province:      strings.TrimSpace(body.Province),
	}
}

func (h *Handler) orderFromBody(ctx context.Context, userID string, body createOrderBody) (models.Order, error) {
	orderType := strings.TrimSpace(body.Type)
	productID := strings.TrimSpace(body.ProductID)
	if orderType == "" {
		if productID == "" {
			orderType = "custom"
		} else {
			orderType = "product"
		}
	}
	if orderType != "product" && orderType != "custom" {
		return models.Order{}, fmt.Errorf("نوع سفارش معتبر نیست.")
	}
	if orderType == "product" && productID == "" {
		return models.Order{}, fmt.Errorf("انتخاب محصول الزامی است.")
	}

	status := strings.TrimSpace(body.Status)
	if status == "" {
		status = "draft"
	}
	if !repository.IsValidOrderStatus(status) {
		return models.Order{}, fmt.Errorf("وضعیت سفارش معتبر نیست.")
	}

	order := models.Order{
		UserID:            userID,
		Type:              orderType,
		ProductID:         productID,
		Status:            status,
		Usage:             strings.TrimSpace(body.Usage),
		UsageOtherText:    strings.TrimSpace(body.UsageOtherText),
		PreferredColor:    strings.TrimSpace(body.PreferredColor),
		StyleNote:         strings.TrimSpace(body.StyleNote),
		Quantity:          body.Quantity,
		NeededBy:          strings.TrimSpace(body.NeededBy),
		CustomerNote:      strings.TrimSpace(body.CustomerNote),
		DeliveryAddressID: strings.TrimSpace(body.DeliveryAddressID),
	}
	if order.Quantity <= 0 {
		order.Quantity = 1
	}

	if order.Type == "product" {
		product, err := h.products.GetProduct(ctx, productID, false)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				return models.Order{}, fmt.Errorf("محصول انتخاب‌شده پیدا نشد.")
			}
			return models.Order{}, fmt.Errorf("دریافت محصول انجام نشد.")
		}
		h.attachProductImageURL(&product)
		order.ProductID = product.ID
		order.ProductSnapshot = productSnapshot(product)
	}

	if order.DeliveryAddressID != "" {
		address, err := h.addresses.GetByUser(ctx, userID, order.DeliveryAddressID)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				return models.Order{}, fmt.Errorf("آدرس تحویل پیدا نشد.")
			}
			return models.Order{}, fmt.Errorf("دریافت آدرس تحویل انجام نشد.")
		}
		order.DeliveryAddressSnapshot = repository.AddressSnapshot(address)
	}

	return order, nil
}

func validateOrderForSubmit(order models.Order) string {
	if order.Status != "draft" {
		return "این سفارش قبلاً ثبت نهایی شده است."
	}
	if order.Type == "product" && order.ProductID == "" {
		return "انتخاب محصول الزامی است."
	}
	if order.Type == "custom" {
		if strings.TrimSpace(order.Usage) == "" {
			return "نوع استفاده را انتخاب کنید."
		}
		if strings.TrimSpace(order.CustomerNote) == "" {
			return "توضیح سفارش اختصاصی الزامی است."
		}
	}
	if order.Quantity <= 0 {
		return "تعداد سفارش معتبر نیست."
	}
	if strings.TrimSpace(order.DeliveryAddressID) == "" {
		return "انتخاب آدرس تحویل الزامی است."
	}
	return ""
}

func (h *Handler) attachReferenceImagesToOrders(ctx context.Context, orders []models.Order) error {
	for index := range orders {
		if err := h.attachReferenceImagesToOrder(ctx, &orders[index]); err != nil {
			return err
		}
	}
	return nil
}

func (h *Handler) attachReferenceImagesToOrder(ctx context.Context, order *models.Order) error {
	images, err := h.orders.ListReferenceImages(ctx, order.ID)
	if err != nil {
		return err
	}
	for index := range images {
		images[index].URL = h.orderReferenceImageURL(order.ID, images[index].ID)
	}
	order.ReferenceImages = images
	return nil
}

func (h *Handler) orderReferenceImageURL(orderID string, imageID string) string {
	return fmt.Sprintf("%s/api/v1/orders/%s/reference-images/%s/content", strings.TrimRight(h.cfg.App.BaseURL, "/"), orderID, imageID)
}

func (h *Handler) courseImagesWithURLs(ctx context.Context, courseID string) ([]models.CourseImage, error) {
	images, err := h.courses.ListImages(ctx, courseID)
	if err != nil {
		return nil, err
	}
	for index := range images {
		images[index].URL = h.courseImageURL(courseID, images[index].ID)
	}
	return images, nil
}

func (h *Handler) attachLessonImageURLs(course *models.Course, images []models.CourseImage) {
	byID := make(map[string]string, len(images))
	for _, image := range images {
		byID[image.ID] = image.URL
	}
	for index := range course.Lessons {
		if url := byID[course.Lessons[index].ImageID]; url != "" {
			course.Lessons[index].ImageURL = url
		}
	}
}

func (h *Handler) attachCourseImageURL(course *models.Course, images []models.CourseImage) {
	for _, image := range images {
		if image.ID == course.ImageID {
			course.ImageURL = image.URL
			return
		}
	}
}

func (h *Handler) attachCourseImagesToList(ctx context.Context, courses []models.Course) error {
	for index := range courses {
		images, err := h.courseImagesWithURLs(ctx, courses[index].ID)
		if err != nil {
			return err
		}
		h.attachCourseImageURL(&courses[index], images)
	}
	return nil
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

	id := generateID()
	filename := id + "-" + filepath.Base(header.Filename)

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

func referenceImageFromUploadHeader(header *multipart.FileHeader, sortOrder int, createdAt time.Time) (models.ImageDocument, error) {
	if header.Size > 5<<20 {
		return models.ImageDocument{}, fmt.Errorf("حجم هر تصویر مرجع باید حداکثر ۵ مگابایت باشد.")
	}
	return imageFromUploadHeader(header, "تصویر مرجع سفارش", sortOrder, createdAt)
}

func nextSortOrder(ctx context.Context, pool *pgxpool.Pool, table string) (int, error) {
	query, err := imageNextSortOrderQuery(table)
	if err != nil {
		return 0, err
	}

	var nextOrder int
	if err := pool.QueryRow(ctx, query).Scan(&nextOrder); err != nil {
		return 0, err
	}
	if nextOrder < 0 {
		return 0, nil
	}
	return nextOrder, nil
}

func imageListQuery(table string) (string, error) {
	t, err := normalizeImageTable(table)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(`SELECT id, alt, filename, content_type, sort_order FROM %s ORDER BY sort_order ASC, filename ASC`, t), nil
}

func imageContentQuery(table string) (string, error) {
	t, err := normalizeImageTable(table)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(`SELECT filename, content_type, data FROM %s WHERE id = $1`, t), nil
}

func imageInsertQuery(table string) (string, error) {
	t, err := normalizeImageTable(table)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(`INSERT INTO %s (id, filename, alt, content_type, data, sort_order, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`, t), nil
}

func imageDeleteQuery(table string) (string, error) {
	t, err := normalizeImageTable(table)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(`DELETE FROM %s WHERE id = $1`, t), nil
}

func imageNextSortOrderQuery(table string) (string, error) {
	t, err := normalizeImageTable(table)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(`SELECT COALESCE(MAX(sort_order), -1) + 1 FROM %s`, t), nil
}

func normalizeImageTable(table string) (string, error) {
	switch table {
	case projectImagesTable, heroSlidesTable:
		return table, nil
	default:
		return "", fmt.Errorf("invalid image table: %s", table)
	}
}

func generateID() string {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("fallback-%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
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

func normalizePhone(value string) (string, error) {
	phone := normalizeDigits(strings.TrimSpace(value))
	replacer := strings.NewReplacer(" ", "", "\t", "", "\n", "", "\r", "", "-", "", "_", "", "(", "", ")", "")
	phone = replacer.Replace(phone)
	if strings.HasPrefix(phone, "00") {
		phone = "+" + strings.TrimPrefix(phone, "00")
	}
	if phone == "" {
		return "", fmt.Errorf("شماره تلفن الزامی است.")
	}
	if strings.HasPrefix(phone, "+") {
		if len(phone) < 2 || !isDigitsOnly(phone[1:]) {
			return "", fmt.Errorf("شماره تلفن معتبر نیست.")
		}
		return phone, nil
	}
	if !isDigitsOnly(phone) {
		return "", fmt.Errorf("شماره تلفن باید فقط شامل عدد باشد.")
	}
	return phone, nil
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
