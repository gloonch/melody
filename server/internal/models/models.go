package models

import (
	"time"
)

type ContactRequest struct {
	ID        string    `db:"id"`
	FullName  string    `db:"full_name"`
	Contact   string    `db:"contact"`
	Message   string    `db:"message"`
	CreatedAt time.Time `db:"created_at"`
}

type CourseSignup struct {
	ID          string    `db:"id"`
	Phone       string    `db:"phone"`
	CourseID    string    `db:"course_id"`
	CourseSlug  string    `db:"course_slug"`
	CourseTitle string    `db:"course_title"`
	CreatedAt   time.Time `db:"created_at"`
}

type User struct {
	ID           string     `json:"id" db:"id"`
	Email        string     `json:"email" db:"email"`
	PasswordHash string     `json:"-" db:"password_hash"`
	FullName     string     `json:"fullName" db:"full_name"`
	FirstName    string     `json:"firstName" db:"first_name"`
	LastName     string     `json:"lastName" db:"last_name"`
	Phone        string     `json:"phone" db:"phone"`
	BirthDate    string     `json:"birthDate" db:"birth_date"`
	Instagram    string     `json:"instagram" db:"instagram"`
	Website      string     `json:"website" db:"website"`
	Role         string     `json:"role" db:"role"`
	IsActive     bool       `json:"isActive" db:"is_active"`
	CreatedAt    time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time  `json:"updatedAt" db:"updated_at"`
	LastLoginAt  *time.Time `json:"lastLoginAt,omitempty" db:"last_login_at"`
}

type RefreshToken struct {
	ID        string     `json:"id" db:"id"`
	UserID    string     `json:"userId" db:"user_id"`
	TokenHash string     `json:"-" db:"token_hash"`
	ExpiresAt time.Time  `json:"expiresAt" db:"expires_at"`
	RevokedAt *time.Time `json:"revokedAt,omitempty" db:"revoked_at"`
	CreatedAt time.Time  `json:"createdAt" db:"created_at"`
}

type Product struct {
	ID               string    `json:"id" db:"id"`
	Slug             string    `json:"slug" db:"slug"`
	Title            string    `json:"title" db:"title"`
	ShortDescription string    `json:"shortDescription" db:"short_description"`
	Description      string    `json:"description" db:"description"`
	CoverImageID     string    `json:"coverImageId" db:"cover_image_id"`
	CoverImageURL    string    `json:"coverImageUrl,omitempty"`
	Category         string    `json:"category" db:"category"`
	UsageLabel       string    `json:"usageLabel" db:"usage_label"`
	Materials        []string  `json:"materials" db:"materials"`
	Colors           []string  `json:"colors" db:"colors"`
	IsCustomizable   bool      `json:"isCustomizable" db:"is_customizable"`
	PriceLabel       string    `json:"priceLabel" db:"price_label"`
	PreparationTime  string    `json:"preparationTime" db:"preparation_time"`
	Status           string    `json:"status" db:"status"`
	SortOrder        int       `json:"sortOrder" db:"sort_order"`
	CreatedAt        time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt        time.Time `json:"updatedAt" db:"updated_at"`
}

type ProductSnapshot struct {
	ID               string `json:"id"`
	Slug             string `json:"slug"`
	Title            string `json:"title"`
	ShortDescription string `json:"shortDescription"`
	CoverImageURL    string `json:"coverImageUrl,omitempty"`
	PriceLabel       string `json:"priceLabel"`
	PreparationTime  string `json:"preparationTime"`
}

type Address struct {
	ID            string    `json:"id" db:"id"`
	UserID        string    `json:"userId" db:"user_id"`
	Title         string    `json:"title" db:"title"`
	FullAddress   string    `json:"fullAddress" db:"full_address"`
	ReceiverName  string    `json:"receiverName" db:"receiver_name"`
	ReceiverPhone string    `json:"receiverPhone" db:"receiver_phone"`
	IsDefault     bool      `json:"isDefault" db:"is_default"`
	Lat           *float64  `json:"lat,omitempty" db:"lat"`
	Lng           *float64  `json:"lng,omitempty" db:"lng"`
	MapProvider   string    `json:"mapProvider" db:"map_provider"`
	PlaceID       string    `json:"placeId" db:"place_id"`
	PostalCode    string    `json:"postalCode" db:"postal_code"`
	City          string    `json:"city" db:"city"`
	Province      string    `json:"province" db:"province"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time `json:"updatedAt" db:"updated_at"`
}

type DeliveryAddressSnapshot struct {
	Title         string `json:"title"`
	FullAddress   string `json:"fullAddress"`
	ReceiverName  string `json:"receiverName,omitempty"`
	ReceiverPhone string `json:"receiverPhone,omitempty"`
}

type OrderReferenceImage struct {
	ID          string    `json:"id" db:"id"`
	OrderID     string    `json:"orderId" db:"order_id"`
	Filename    string    `json:"filename" db:"filename"`
	ContentType string    `json:"contentType" db:"content_type"`
	Data        []byte    `json:"-" db:"data"`
	SortOrder   int       `json:"sortOrder" db:"sort_order"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
	URL         string    `json:"url,omitempty"`
}

type OrderStatusEntry struct {
	Status    string    `json:"status"`
	Note      string    `json:"note,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

type Order struct {
	ID                      string                  `json:"id" db:"id"`
	UserID                  string                  `json:"userId" db:"user_id"`
	UserName                string                  `json:"userName,omitempty"`
	UserPhone               string                  `json:"userPhone,omitempty"`
	Type                    string                  `json:"type" db:"type"`
	ProductID               string                  `json:"productId" db:"product_id"`
	ProductSnapshot         ProductSnapshot         `json:"productSnapshot" db:"product_snapshot"`
	Status                  string                  `json:"status" db:"status"`
	Usage                   string                  `json:"usage" db:"usage"`
	UsageOtherText          string                  `json:"usageOtherText" db:"usage_other_text"`
	PreferredColor          string                  `json:"preferredColor" db:"preferred_color"`
	StyleNote               string                  `json:"styleNote" db:"style_note"`
	Quantity                int                     `json:"quantity" db:"quantity"`
	NeededBy                string                  `json:"neededBy" db:"needed_by"`
	CustomerNote            string                  `json:"customerNote" db:"customer_note"`
	ReferenceImages         []OrderReferenceImage   `json:"referenceImages"`
	DeliveryAddressID       string                  `json:"deliveryAddressId" db:"delivery_address_id"`
	DeliveryAddressSnapshot DeliveryAddressSnapshot `json:"deliveryAddressSnapshot" db:"delivery_address_snapshot"`
	AdminNote               string                  `json:"adminNote" db:"admin_note"`
	StatusHistory           []OrderStatusEntry      `json:"statusHistory" db:"status_history"`
	CreatedAt               time.Time               `json:"createdAt" db:"created_at"`
	UpdatedAt               time.Time               `json:"updatedAt" db:"updated_at"`
	SubmittedAt             *time.Time              `json:"submittedAt,omitempty" db:"submitted_at"`
}

type CourseLesson struct {
	ID           string   `json:"id"`
	ChapterID    string   `json:"chapterId,omitempty"`
	ChapterTitle string   `json:"chapterTitle,omitempty"`
	Title        string   `json:"title"`
	Level        string   `json:"level"`
	Type         string   `json:"type"`
	Duration     string   `json:"duration"`
	Summary      string   `json:"summary"`
	Body         string   `json:"body,omitempty"`
	VideoURL     string   `json:"videoUrl,omitempty"`
	Materials    []string `json:"materials"`
	ImageID      string   `json:"imageId,omitempty"`
	ImageURL     string   `json:"imageUrl,omitempty"`
}

type Course struct {
	ID          string         `json:"id" db:"id"`
	Slug        string         `json:"slug" db:"slug"`
	Title       string         `json:"title" db:"title"`
	Subtitle    string         `json:"subtitle" db:"subtitle"`
	Term        string         `json:"term" db:"term"`
	Level       string         `json:"level" db:"level"`
	Format      string         `json:"format" db:"format"`
	Duration    string         `json:"duration" db:"duration"`
	Summary     string         `json:"summary" db:"summary"`
	Description string         `json:"description" db:"description"`
	Status      string         `json:"status" db:"status"`
	PriceLabel  string         `json:"priceLabel" db:"price_label"`
	ImageID     string         `json:"imageId,omitempty" db:"image_id"`
	ImageURL    string         `json:"imageUrl,omitempty"`
	SortOrder   int            `json:"sortOrder" db:"sort_order"`
	Outcomes    []string       `json:"outcomes" db:"outcomes"`
	Audience    []string       `json:"audience" db:"audience"`
	Lessons     []CourseLesson `json:"lessons" db:"lessons"`
	CreatedAt   time.Time      `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time      `json:"updatedAt" db:"updated_at"`
}

type CourseAccess struct {
	ID        string    `json:"id" db:"id"`
	CourseID  string    `json:"courseId" db:"course_id"`
	UserID    string    `json:"userId" db:"user_id"`
	UserName  string    `json:"userName,omitempty"`
	UserPhone string    `json:"userPhone,omitempty"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

type CourseImage struct {
	ID          string    `json:"id" db:"id"`
	CourseID    string    `json:"courseId" db:"course_id"`
	Filename    string    `json:"filename" db:"filename"`
	Alt         string    `json:"alt" db:"alt"`
	ContentType string    `json:"contentType" db:"content_type"`
	Data        []byte    `json:"-" db:"data"`
	SortOrder   int       `json:"sortOrder" db:"sort_order"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
	URL         string    `json:"url,omitempty"`
}

type ImageDocument struct {
	ID          string    `db:"id"`
	Filename    string    `db:"filename"`
	Alt         string    `db:"alt"`
	ContentType string    `db:"content_type"`
	Data        []byte    `db:"data"`
	SortOrder   int       `db:"sort_order"`
	CreatedAt   time.Time `db:"created_at"`
}

type ProjectImage = ImageDocument

type HeroSlide = ImageDocument
