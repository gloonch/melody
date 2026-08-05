package models

import (
	"encoding/json"
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
	UserID      string    `db:"user_id"`
	Phone       string    `db:"phone"`
	CourseID    string    `db:"course_id"`
	CourseSlug  string    `db:"course_slug"`
	CourseTitle string    `db:"course_title"`
	RequestType string    `db:"request_type"`
	CreatedAt   time.Time `db:"created_at"`
}

type ImageSource struct {
	URL   string `json:"url"`
	Width int    `json:"width"`
	Type  string `json:"type"`
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
	ID                string        `json:"id" db:"id"`
	Slug              string        `json:"slug" db:"slug"`
	Title             string        `json:"title" db:"title"`
	ShortDescription  string        `json:"shortDescription" db:"short_description"`
	Description       string        `json:"description" db:"description"`
	CoverImageID      string        `json:"coverImageId" db:"cover_image_id"`
	CoverImageURL     string        `json:"coverImageUrl,omitempty"`
	CoverImageSources []ImageSource `json:"coverImageSources,omitempty"`
	Category          string        `json:"category" db:"category"`
	UsageLabel        string        `json:"usageLabel" db:"usage_label"`
	Materials         []string      `json:"materials" db:"materials"`
	Colors            []string      `json:"colors" db:"colors"`
	IsCustomizable    bool          `json:"isCustomizable" db:"is_customizable"`
	PriceLabel        string        `json:"priceLabel" db:"price_label"`
	BasePriceRial     int64         `json:"basePriceRial" db:"base_price_rial"`
	PriceCurrency     string        `json:"priceCurrency" db:"price_currency"`
	Availability      string        `json:"availability" db:"availability"`
	PreparationTime   string        `json:"preparationTime" db:"preparation_time"`
	PreparationDays   int           `json:"preparationDays" db:"preparation_days"`
	IsFeatured        bool          `json:"isFeatured" db:"is_featured"`
	FeaturedOrder     int           `json:"featuredOrder" db:"featured_order"`
	SEOTitle          string        `json:"seoTitle" db:"seo_title"`
	SEODescription    string        `json:"seoDescription" db:"seo_description"`
	Status            string        `json:"status" db:"status"`
	SortOrder         int           `json:"sortOrder" db:"sort_order"`
	CreatedAt         time.Time     `json:"createdAt" db:"created_at"`
	UpdatedAt         time.Time     `json:"updatedAt" db:"updated_at"`
}

type ProductSnapshot struct {
	ID               string `json:"id"`
	Slug             string `json:"slug"`
	Title            string `json:"title"`
	ShortDescription string `json:"shortDescription"`
	CoverImageURL    string `json:"coverImageUrl,omitempty"`
	PriceLabel       string `json:"priceLabel"`
	BasePriceRial    int64  `json:"basePriceRial"`
	PriceCurrency    string `json:"priceCurrency"`
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
	ID           string        `json:"id"`
	ChapterID    string        `json:"chapterId,omitempty"`
	ChapterTitle string        `json:"chapterTitle,omitempty"`
	Title        string        `json:"title"`
	Level        string        `json:"level"`
	Type         string        `json:"type"`
	Duration     string        `json:"duration"`
	Summary      string        `json:"summary"`
	Body         string        `json:"body,omitempty"`
	VideoURL     string        `json:"videoUrl,omitempty"`
	Materials    []string      `json:"materials"`
	ImageID      string        `json:"imageId,omitempty"`
	ImageURL     string        `json:"imageUrl,omitempty"`
	ImageSources []ImageSource `json:"imageSources,omitempty"`
}

type Course struct {
	ID             string         `json:"id" db:"id"`
	Slug           string         `json:"slug" db:"slug"`
	Title          string         `json:"title" db:"title"`
	Subtitle       string         `json:"subtitle" db:"subtitle"`
	Term           string         `json:"term" db:"term"`
	Level          string         `json:"level" db:"level"`
	Format         string         `json:"format" db:"format"`
	Duration       string         `json:"duration" db:"duration"`
	Summary        string         `json:"summary" db:"summary"`
	Description    string         `json:"description" db:"description"`
	Status         string         `json:"status" db:"status"`
	PriceLabel     string         `json:"priceLabel" db:"price_label"`
	BasePriceRial  int64          `json:"basePriceRial" db:"base_price_rial"`
	PriceCurrency  string         `json:"priceCurrency" db:"price_currency"`
	AccessDuration string         `json:"accessDuration" db:"access_duration"`
	SupportType    string         `json:"supportType" db:"support_type"`
	Prerequisites  []string       `json:"prerequisites" db:"prerequisites"`
	ImageID        string         `json:"imageId,omitempty" db:"image_id"`
	ImageURL       string         `json:"imageUrl,omitempty"`
	ImageSources   []ImageSource  `json:"imageSources,omitempty"`
	SortOrder      int            `json:"sortOrder" db:"sort_order"`
	Outcomes       []string       `json:"outcomes" db:"outcomes"`
	Audience       []string       `json:"audience" db:"audience"`
	Lessons        []CourseLesson `json:"lessons" db:"lessons"`
	CreatedAt      time.Time      `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time      `json:"updatedAt" db:"updated_at"`
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
	ID          string        `json:"id" db:"id"`
	CourseID    string        `json:"courseId" db:"course_id"`
	Filename    string        `json:"filename" db:"filename"`
	Alt         string        `json:"alt" db:"alt"`
	ContentType string        `json:"contentType" db:"content_type"`
	Data        []byte        `json:"-" db:"data"`
	SortOrder   int           `json:"sortOrder" db:"sort_order"`
	CreatedAt   time.Time     `json:"createdAt" db:"created_at"`
	URL         string        `json:"url,omitempty"`
	Sources     []ImageSource `json:"sources,omitempty"`
}

type ImageVariant struct {
	ID          string    `json:"id" db:"id"`
	SourceTable string    `json:"sourceTable" db:"source_table"`
	SourceID    string    `json:"sourceId" db:"source_id"`
	Width       int       `json:"width" db:"width"`
	Height      int       `json:"height" db:"height"`
	VariantKey  string    `json:"variantKey" db:"variant_key"`
	ContentType string    `json:"contentType" db:"content_type"`
	Data        []byte    `json:"-" db:"data"`
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

type BlogFAQItem struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

type BlogTOCItem struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Level int    `json:"level"`
}

type BlogCategory struct {
	ID          string    `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Slug        string    `json:"slug" db:"slug"`
	Description string    `json:"description" db:"description"`
	SortOrder   int       `json:"sortOrder" db:"sort_order"`
	IsActive    bool      `json:"isActive" db:"is_active"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time `json:"updatedAt" db:"updated_at"`
}

type BlogImage struct {
	ID          string        `json:"id" db:"id"`
	BlogID      string        `json:"blogId" db:"blog_id"`
	Filename    string        `json:"filename" db:"filename"`
	Alt         string        `json:"alt" db:"alt"`
	Caption     string        `json:"caption" db:"caption"`
	ContentType string        `json:"contentType" db:"content_type"`
	Data        []byte        `json:"-" db:"data"`
	Width       int           `json:"width" db:"width"`
	Height      int           `json:"height" db:"height"`
	SortOrder   int           `json:"sortOrder" db:"sort_order"`
	CreatedAt   time.Time     `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time     `json:"updatedAt" db:"updated_at"`
	URL         string        `json:"url,omitempty"`
	Sources     []ImageSource `json:"sources,omitempty"`
	OGURL       string        `json:"ogUrl,omitempty"`
}

type BlogPostSummary struct {
	ID                 string        `json:"id"`
	Title              string        `json:"title"`
	Slug               string        `json:"slug"`
	Excerpt            string        `json:"excerpt"`
	CategoryID         string        `json:"categoryId,omitempty"`
	CategoryName       string        `json:"categoryName,omitempty"`
	CoverImageID       string        `json:"coverImageId,omitempty"`
	CoverImageURL      string        `json:"coverImageUrl,omitempty"`
	CoverImageSources  []ImageSource `json:"coverImageSources,omitempty"`
	CoverImageAlt      string        `json:"coverImageAlt,omitempty"`
	AuthorName         string        `json:"authorName"`
	ReadingTimeMinutes int           `json:"readingTimeMinutes"`
	PublishedAt        *time.Time    `json:"publishedAt,omitempty"`
	UpdatedAt          time.Time     `json:"updatedAt"`
	Status             string        `json:"status,omitempty"`
	ScheduledFor       *time.Time    `json:"scheduledFor,omitempty"`
}

type BlogPost struct {
	ID                 string            `json:"id" db:"id"`
	Title              string            `json:"title" db:"title"`
	Slug               string            `json:"slug" db:"slug"`
	Excerpt            string            `json:"excerpt" db:"excerpt"`
	BodyHTML           string            `json:"bodyHtml" db:"body_html"`
	BodyHTMLSource     string            `json:"bodyHtmlSource,omitempty" db:"body_html_source"`
	BodyJSON           json.RawMessage   `json:"bodyJson,omitempty" db:"body_json"`
	TableOfContents    []BlogTOCItem     `json:"tableOfContents"`
	CategoryID         string            `json:"categoryId" db:"category_id"`
	CategoryName       string            `json:"categoryName,omitempty"`
	Tags               []string          `json:"tags" db:"tags"`
	CoverImageID       string            `json:"coverImageId" db:"cover_image_id"`
	CoverImageURL      string            `json:"coverImageUrl,omitempty"`
	CoverImageSources  []ImageSource     `json:"coverImageSources,omitempty"`
	CoverImageAlt      string            `json:"coverImageAlt" db:"cover_image_alt"`
	OGImageID          string            `json:"ogImageId" db:"og_image_id"`
	OGImageURL         string            `json:"ogImageUrl,omitempty"`
	OGImageAlt         string            `json:"ogImageAlt" db:"og_image_alt"`
	FocusKeyword       string            `json:"focusKeyword" db:"focus_keyword"`
	SecondaryKeywords  []string          `json:"secondaryKeywords" db:"secondary_keywords"`
	SEOTitle           string            `json:"seoTitle" db:"seo_title"`
	SEODescription     string            `json:"seoDescription" db:"seo_description"`
	AuthorName         string            `json:"authorName" db:"author_name"`
	ReviewerName       string            `json:"reviewerName" db:"reviewer_name"`
	FAQItems           []BlogFAQItem     `json:"faqItems" db:"faq_items"`
	RelatedPostIDs     []string          `json:"relatedPostIds" db:"related_post_ids"`
	RelatedPosts       []BlogPostSummary `json:"relatedPosts,omitempty"`
	CTALabel           string            `json:"ctaLabel" db:"cta_label"`
	CTAText            string            `json:"ctaText" db:"cta_text"`
	CTAURL             string            `json:"ctaUrl" db:"cta_url"`
	Status             string            `json:"status" db:"status"`
	ScheduledFor       *time.Time        `json:"scheduledFor,omitempty" db:"scheduled_for"`
	ScheduledForTehran string            `json:"scheduledForTehranLocal,omitempty"`
	PublishedAt        *time.Time        `json:"publishedAt,omitempty" db:"published_at"`
	ReadingTimeMinutes int               `json:"readingTimeMinutes" db:"reading_time_minutes"`
	CreatedAt          time.Time         `json:"createdAt" db:"created_at"`
	UpdatedAt          time.Time         `json:"updatedAt" db:"updated_at"`
}

type BlogList struct {
	Posts      []BlogPostSummary `json:"posts"`
	Page       int               `json:"page"`
	Limit      int               `json:"limit"`
	Total      int               `json:"total"`
	TotalPages int               `json:"totalPages"`
}

type ProjectImage = ImageDocument

type HeroSlide = ImageDocument
