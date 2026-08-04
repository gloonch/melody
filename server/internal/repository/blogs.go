package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"melody-server/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrBlogGone       = errors.New("blog post is archived")
	ErrInvalidBlog    = errors.New("invalid blog post")
	ErrCannotDelete   = errors.New("published blog posts cannot be deleted")
	ErrInvalidPublish = errors.New("blog post is not ready to publish")
)

var blogSlugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

const blogColumns = `p.id, p.title, p.slug, p.excerpt, p.body_html, p.body_html_source, COALESCE(p.category_id, ''),
	COALESCE(c.name, ''), p.tags, p.cover_image_id, p.cover_image_alt, p.og_image_id, p.og_image_alt,
	p.focus_keyword, p.secondary_keywords, p.seo_title, p.seo_description, p.author_name, p.reviewer_name,
	p.faq_items, p.related_post_ids, p.cta_label, p.cta_text, p.cta_url, p.status, p.scheduled_for,
	p.published_at, p.reading_time_minutes, p.created_at, p.updated_at`

const blogSummaryColumns = `p.id, p.title, p.slug, p.excerpt, COALESCE(p.category_id, ''),
	COALESCE(c.name, ''), p.cover_image_id, p.cover_image_alt, p.author_name, p.reading_time_minutes,
	p.published_at, p.updated_at, p.status, p.scheduled_for`

const publicBlogPredicate = `((p.status = 'published' AND p.published_at IS NOT NULL AND p.published_at <= NOW())
	OR (p.status = 'scheduled' AND p.scheduled_for IS NOT NULL AND p.scheduled_for <= NOW()))`

type BlogRepository struct {
	pool *pgxpool.Pool
}

func NewBlogRepository(pool *pgxpool.Pool) *BlogRepository {
	return &BlogRepository{pool: pool}
}

func ValidateBlogSlug(slug string) error {
	slug = strings.TrimSpace(slug)
	if len(slug) < 3 || len(slug) > 100 || !blogSlugPattern.MatchString(slug) {
		return fmt.Errorf("%w: slug must use 3-100 lowercase latin letters, numbers, and hyphens", ErrInvalidBlog)
	}
	return nil
}

func (r *BlogRepository) ListPublic(ctx context.Context, page, limit int) (models.BlogList, error) {
	page, limit = normalizePagination(page, limit)
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM blog_posts p WHERE `+publicBlogPredicate).Scan(&total); err != nil {
		return models.BlogList{}, err
	}
	rows, err := r.pool.Query(ctx, `SELECT `+blogSummaryColumns+`
		FROM blog_posts p LEFT JOIN blog_categories c ON c.id = p.category_id
		WHERE `+publicBlogPredicate+`
		ORDER BY COALESCE(p.published_at, p.scheduled_for) DESC, p.id DESC LIMIT $1 OFFSET $2`, limit, (page-1)*limit)
	if err != nil {
		return models.BlogList{}, err
	}
	defer rows.Close()
	posts, err := scanBlogSummaries(rows)
	if err != nil {
		return models.BlogList{}, err
	}
	for index := range posts {
		normalizePublicBlogSummary(&posts[index])
	}
	pages := (total + limit - 1) / limit
	return models.BlogList{Posts: posts, Page: page, Limit: limit, Total: total, TotalPages: pages}, nil
}

func (r *BlogRepository) ListAdmin(ctx context.Context, search, status string) ([]models.BlogPostSummary, error) {
	search = strings.TrimSpace(search)
	status = strings.TrimSpace(status)
	rows, err := r.pool.Query(ctx, `SELECT `+blogSummaryColumns+`
		FROM blog_posts p LEFT JOIN blog_categories c ON c.id = p.category_id
		WHERE ($1 = '' OR p.status = $1) AND ($2 = '' OR p.title ILIKE '%' || $2 || '%' OR p.slug ILIKE '%' || $2 || '%')
		ORDER BY p.updated_at DESC`, status, search)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanBlogSummaries(rows)
}

func (r *BlogRepository) GetAdmin(ctx context.Context, id string) (models.BlogPost, error) {
	return r.getPost(ctx, `p.id = $1`, strings.TrimSpace(id))
}

func (r *BlogRepository) GetPublic(ctx context.Context, slug string) (models.BlogPost, bool, error) {
	slug = strings.TrimSpace(slug)
	post, err := r.getPost(ctx, `p.slug = $1`, slug)
	redirected := false
	if errors.Is(err, ErrNotFound) {
		row := r.pool.QueryRow(ctx, `SELECT blog_id FROM blog_slug_history WHERE slug=$1`, slug)
		var postID string
		if scanErr := row.Scan(&postID); errors.Is(scanErr, pgx.ErrNoRows) {
			return models.BlogPost{}, false, ErrNotFound
		} else if scanErr != nil {
			return models.BlogPost{}, false, scanErr
		}
		post, err = r.GetAdmin(ctx, postID)
		redirected = true
	}
	if err != nil {
		return models.BlogPost{}, false, err
	}
	if post.Status == "archived" {
		return models.BlogPost{}, false, ErrBlogGone
	}
	now, err := r.databaseNow(ctx)
	if err != nil {
		return models.BlogPost{}, false, err
	}
	if !isEffectivePublished(post, now) {
		return models.BlogPost{}, false, ErrNotFound
	}
	post.RelatedPosts, _ = r.relatedPosts(ctx, post)
	if post.PublishedAt == nil && post.ScheduledFor != nil {
		publishedAt := *post.ScheduledFor
		post.PublishedAt = &publishedAt
	}
	post.Status = "published"
	post.ScheduledFor = nil
	return post, redirected, nil
}

func (r *BlogRepository) Create(ctx context.Context, post models.BlogPost) (models.BlogPost, error) {
	normalizeBlog(&post)
	post.Status = "draft"
	post.ScheduledFor = nil
	post.PublishedAt = nil
	if err := validateBlog(post); err != nil {
		return models.BlogPost{}, err
	}
	post.ID = generateID()
	now := time.Now().UTC()
	post.CreatedAt, post.UpdatedAt = now, now
	var historical bool
	if err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM blog_slug_history WHERE slug=$1)`, post.Slug).Scan(&historical); err != nil {
		return models.BlogPost{}, err
	}
	if historical {
		return models.BlogPost{}, fmt.Errorf("%w: slug belongs to publication history", ErrInvalidBlog)
	}
	_, err := r.pool.Exec(ctx, `INSERT INTO blog_posts (
		id,title,slug,excerpt,body_html,body_html_source,category_id,tags,cover_image_id,cover_image_alt,og_image_id,og_image_alt,
		focus_keyword,secondary_keywords,seo_title,seo_description,author_name,reviewer_name,faq_items,related_post_ids,
		cta_label,cta_text,cta_url,status,scheduled_for,published_at,reading_time_minutes,created_at,updated_at
	) VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7,''),$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)`,
		post.ID, post.Title, post.Slug, post.Excerpt, post.BodyHTML, post.BodyHTMLSource, post.CategoryID, mustJSON(post.Tags), post.CoverImageID,
		post.CoverImageAlt, post.OGImageID, post.OGImageAlt, post.FocusKeyword, mustJSON(post.SecondaryKeywords), post.SEOTitle,
		post.SEODescription, post.AuthorName, post.ReviewerName, mustJSON(post.FAQItems), mustJSON(post.RelatedPostIDs), post.CTALabel,
		post.CTAText, post.CTAURL, post.Status, post.ScheduledFor, post.PublishedAt, post.ReadingTimeMinutes, post.CreatedAt, post.UpdatedAt)
	if err != nil {
		return models.BlogPost{}, err
	}
	return r.GetAdmin(ctx, post.ID)
}

func (r *BlogRepository) Update(ctx context.Context, id string, post models.BlogPost) (models.BlogPost, error) {
	normalizeBlog(&post)
	if err := validateBlog(post); err != nil {
		return models.BlogPost{}, err
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return models.BlogPost{}, err
	}
	defer tx.Rollback(ctx)

	var oldSlug string
	var publishedAt *time.Time
	if err := tx.QueryRow(ctx, `SELECT slug,published_at FROM blog_posts WHERE id=$1 FOR UPDATE`, id).Scan(&oldSlug, &publishedAt); errors.Is(err, pgx.ErrNoRows) {
		return models.BlogPost{}, ErrNotFound
	} else if err != nil {
		return models.BlogPost{}, err
	}
	if oldSlug != post.Slug {
		var historyOwner string
		historyErr := tx.QueryRow(ctx, `SELECT blog_id FROM blog_slug_history WHERE slug=$1`, post.Slug).Scan(&historyOwner)
		if historyErr == nil && historyOwner != id {
			return models.BlogPost{}, fmt.Errorf("%w: slug belongs to another publication history", ErrInvalidBlog)
		}
		if historyErr != nil && !errors.Is(historyErr, pgx.ErrNoRows) {
			return models.BlogPost{}, historyErr
		}
		if historyOwner == id {
			if _, err := tx.Exec(ctx, `DELETE FROM blog_slug_history WHERE slug=$1 AND blog_id=$2`, post.Slug, id); err != nil {
				return models.BlogPost{}, err
			}
		}
		if publishedAt != nil {
			if _, err := tx.Exec(ctx, `INSERT INTO blog_slug_history (slug,blog_id) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET blog_id=EXCLUDED.blog_id`, oldSlug, id); err != nil {
				return models.BlogPost{}, err
			}
		}
	}
	_, err = tx.Exec(ctx, `UPDATE blog_posts SET title=$2,slug=$3,excerpt=$4,body_html=$5,body_html_source=$6,category_id=NULLIF($7,''),tags=$8,
		cover_image_id=$9,cover_image_alt=$10,og_image_id=$11,og_image_alt=$12,focus_keyword=$13,secondary_keywords=$14,
		seo_title=$15,seo_description=$16,author_name=$17,reviewer_name=$18,faq_items=$19,related_post_ids=$20,
		cta_label=$21,cta_text=$22,cta_url=$23,reading_time_minutes=$24,updated_at=NOW() WHERE id=$1`,
		id, post.Title, post.Slug, post.Excerpt, post.BodyHTML, post.BodyHTMLSource, post.CategoryID, mustJSON(post.Tags), post.CoverImageID,
		post.CoverImageAlt, post.OGImageID, post.OGImageAlt, post.FocusKeyword, mustJSON(post.SecondaryKeywords), post.SEOTitle,
		post.SEODescription, post.AuthorName, post.ReviewerName, mustJSON(post.FAQItems), mustJSON(post.RelatedPostIDs), post.CTALabel,
		post.CTAText, post.CTAURL, post.ReadingTimeMinutes)
	if err != nil {
		return models.BlogPost{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.BlogPost{}, err
	}
	return r.GetAdmin(ctx, id)
}

func (r *BlogRepository) SetPublication(ctx context.Context, id, status string, scheduledFor *time.Time) (models.BlogPost, error) {
	post, err := r.GetAdmin(ctx, id)
	if err != nil {
		return models.BlogPost{}, err
	}
	status = strings.TrimSpace(status)
	switch status {
	case "draft":
		if post.PublishedAt != nil {
			return models.BlogPost{}, fmt.Errorf("%w: use archived for a published post", ErrInvalidPublish)
		}
		_, err = r.pool.Exec(ctx, `UPDATE blog_posts SET status='draft',scheduled_for=NULL,updated_at=NOW() WHERE id=$1`, id)
	case "scheduled":
		if post.PublishedAt != nil || scheduledFor == nil {
			return models.BlogPost{}, fmt.Errorf("%w: a new scheduled post needs a publication time", ErrInvalidPublish)
		}
		if err = r.validateForPublication(ctx, post); err != nil {
			return models.BlogPost{}, err
		}
		now, nowErr := r.databaseNow(ctx)
		if nowErr != nil {
			return models.BlogPost{}, nowErr
		}
		if !scheduledFor.After(now) {
			return models.BlogPost{}, fmt.Errorf("%w: scheduled time must be in the future", ErrInvalidPublish)
		}
		_, err = r.pool.Exec(ctx, `UPDATE blog_posts SET status='scheduled',scheduled_for=$2,updated_at=NOW() WHERE id=$1`, id, scheduledFor.UTC())
	case "published":
		if err = r.validateForPublication(ctx, post); err != nil {
			return models.BlogPost{}, err
		}
		_, err = r.pool.Exec(ctx, `UPDATE blog_posts SET status='published',scheduled_for=NULL,published_at=COALESCE(published_at,NOW()),updated_at=NOW() WHERE id=$1`, id)
	case "archived":
		if post.PublishedAt == nil {
			return models.BlogPost{}, fmt.Errorf("%w: only published posts can be archived", ErrInvalidPublish)
		}
		_, err = r.pool.Exec(ctx, `UPDATE blog_posts SET status='archived',scheduled_for=NULL,updated_at=NOW() WHERE id=$1`, id)
	default:
		return models.BlogPost{}, fmt.Errorf("%w: unsupported publication status", ErrInvalidPublish)
	}
	if err != nil {
		return models.BlogPost{}, err
	}
	return r.GetAdmin(ctx, id)
}

func (r *BlogRepository) ReconcileScheduled(ctx context.Context) (int64, error) {
	result, err := r.pool.Exec(ctx, `UPDATE blog_posts SET status='published',published_at=COALESCE(published_at,scheduled_for),scheduled_for=NULL,updated_at=NOW()
		WHERE status='scheduled' AND scheduled_for IS NOT NULL AND scheduled_for <= NOW()`)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

func (r *BlogRepository) Delete(ctx context.Context, id string) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM blog_posts WHERE id=$1 AND status='draft' AND published_at IS NULL`, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		var exists bool
		if err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM blog_posts WHERE id=$1)`, id).Scan(&exists); err != nil {
			return err
		}
		if exists {
			return ErrCannotDelete
		}
		return ErrNotFound
	}
	return nil
}

func (r *BlogRepository) ListCategories(ctx context.Context, includeInactive bool) ([]models.BlogCategory, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,name,slug,description,sort_order,is_active,created_at,updated_at FROM blog_categories
		WHERE $1 OR is_active ORDER BY sort_order,name`, includeInactive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]models.BlogCategory, 0)
	for rows.Next() {
		var item models.BlogCategory
		if err := rows.Scan(&item.ID, &item.Name, &item.Slug, &item.Description, &item.SortOrder, &item.IsActive, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *BlogRepository) SaveCategory(ctx context.Context, category models.BlogCategory) (models.BlogCategory, error) {
	category.Name = strings.TrimSpace(category.Name)
	category.Slug = strings.TrimSpace(strings.ToLower(category.Slug))
	category.Description = strings.TrimSpace(category.Description)
	if category.Name == "" || ValidateBlogSlug(category.Slug) != nil {
		return models.BlogCategory{}, ErrInvalidBlog
	}
	if category.ID == "" {
		category.ID = generateID()
		row := r.pool.QueryRow(ctx, `INSERT INTO blog_categories (id,name,slug,description,sort_order,is_active) VALUES ($1,$2,$3,$4,$5,$6)
			RETURNING id,name,slug,description,sort_order,is_active,created_at,updated_at`, category.ID, category.Name, category.Slug, category.Description, category.SortOrder, category.IsActive)
		return scanCategory(row)
	}
	row := r.pool.QueryRow(ctx, `UPDATE blog_categories SET name=$2,slug=$3,description=$4,sort_order=$5,is_active=$6,updated_at=NOW() WHERE id=$1
		RETURNING id,name,slug,description,sort_order,is_active,created_at,updated_at`, category.ID, category.Name, category.Slug, category.Description, category.SortOrder, category.IsActive)
	return scanCategory(row)
}

func (r *BlogRepository) DeleteCategory(ctx context.Context, id string) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM blog_categories WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *BlogRepository) ListImages(ctx context.Context, blogID string) ([]models.BlogImage, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,blog_id,filename,alt,caption,content_type,width,height,sort_order,created_at,updated_at FROM blog_images WHERE blog_id=$1 ORDER BY sort_order,filename`, blogID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	images := make([]models.BlogImage, 0)
	for rows.Next() {
		var image models.BlogImage
		if err := rows.Scan(&image.ID, &image.BlogID, &image.Filename, &image.Alt, &image.Caption, &image.ContentType, &image.Width, &image.Height, &image.SortOrder, &image.CreatedAt, &image.UpdatedAt); err != nil {
			return nil, err
		}
		images = append(images, image)
	}
	return images, rows.Err()
}

func (r *BlogRepository) CreateImage(ctx context.Context, image models.BlogImage) (models.BlogImage, error) {
	if image.ID == "" {
		image.ID = generateID()
	}
	row := r.pool.QueryRow(ctx, `INSERT INTO blog_images (id,blog_id,filename,alt,caption,content_type,data,width,height,sort_order)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,blog_id,filename,alt,caption,content_type,width,height,sort_order,created_at,updated_at`,
		image.ID, image.BlogID, image.Filename, strings.TrimSpace(image.Alt), strings.TrimSpace(image.Caption), image.ContentType, image.Data, image.Width, image.Height, image.SortOrder)
	return scanBlogImage(row)
}

func (r *BlogRepository) UpdateImage(ctx context.Context, blogID, imageID, alt, caption string) (models.BlogImage, error) {
	row := r.pool.QueryRow(ctx, `UPDATE blog_images SET alt=$3,caption=$4,updated_at=NOW() WHERE id=$1 AND blog_id=$2
		RETURNING id,blog_id,filename,alt,caption,content_type,width,height,sort_order,created_at,updated_at`, imageID, blogID, strings.TrimSpace(alt), strings.TrimSpace(caption))
	return scanBlogImage(row)
}

func (r *BlogRepository) GetImage(ctx context.Context, imageID string, withData bool) (models.BlogImage, error) {
	columns := `id,blog_id,filename,alt,caption,content_type,width,height,sort_order,created_at,updated_at`
	if withData {
		columns += `,data`
	}
	row := r.pool.QueryRow(ctx, `SELECT `+columns+` FROM blog_images WHERE id=$1`, imageID)
	var image models.BlogImage
	values := []any{&image.ID, &image.BlogID, &image.Filename, &image.Alt, &image.Caption, &image.ContentType, &image.Width, &image.Height, &image.SortOrder, &image.CreatedAt, &image.UpdatedAt}
	if withData {
		values = append(values, &image.Data)
	}
	if err := row.Scan(values...); errors.Is(err, pgx.ErrNoRows) {
		return models.BlogImage{}, ErrNotFound
	} else if err != nil {
		return models.BlogImage{}, err
	}
	return image, nil
}

func (r *BlogRepository) DeleteImage(ctx context.Context, blogID, imageID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `UPDATE blog_posts SET cover_image_id='',cover_image_alt='',og_image_id='',og_image_alt='',updated_at=NOW()
		WHERE id=$1 AND (cover_image_id=$2 OR og_image_id=$2)`, blogID, imageID); err != nil {
		return err
	}
	result, err := tx.Exec(ctx, `DELETE FROM blog_images WHERE id=$1 AND blog_id=$2`, imageID, blogID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return tx.Commit(ctx)
}

func (r *BlogRepository) getPost(ctx context.Context, predicate string, value string) (models.BlogPost, error) {
	row := r.pool.QueryRow(ctx, `SELECT `+blogColumns+` FROM blog_posts p LEFT JOIN blog_categories c ON c.id=p.category_id WHERE `+predicate+` LIMIT 1`, value)
	post, err := scanBlogPost(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.BlogPost{}, ErrNotFound
	}
	return post, err
}

func (r *BlogRepository) relatedPosts(ctx context.Context, post models.BlogPost) ([]models.BlogPostSummary, error) {
	var rows pgx.Rows
	var err error
	if len(post.RelatedPostIDs) > 0 {
		rows, err = r.pool.Query(ctx, `SELECT `+blogSummaryColumns+` FROM blog_posts p LEFT JOIN blog_categories c ON c.id=p.category_id
			WHERE p.id=ANY($1) AND p.id<>$2 AND `+publicBlogPredicate+` ORDER BY array_position($1::text[],p.id) LIMIT 3`, post.RelatedPostIDs, post.ID)
	} else {
		rows, err = r.pool.Query(ctx, `SELECT `+blogSummaryColumns+` FROM blog_posts p LEFT JOIN blog_categories c ON c.id=p.category_id
			WHERE p.id<>$1 AND ($2='' OR p.category_id=$2) AND `+publicBlogPredicate+` ORDER BY COALESCE(p.published_at,p.scheduled_for) DESC LIMIT 3`, post.ID, post.CategoryID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	posts, err := scanBlogSummaries(rows)
	if err != nil {
		return nil, err
	}
	for index := range posts {
		normalizePublicBlogSummary(&posts[index])
	}
	return posts, nil
}

func (r *BlogRepository) validateForPublication(ctx context.Context, post models.BlogPost) error {
	if strings.TrimSpace(post.Excerpt) == "" || strings.TrimSpace(post.BodyHTML) == "" || strings.TrimSpace(post.CoverImageID) == "" || strings.TrimSpace(post.CoverImageAlt) == "" {
		return fmt.Errorf("%w: excerpt, body, cover image, and cover alt are required", ErrInvalidPublish)
	}
	var exists bool
	if err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM blog_images WHERE id=$1 AND blog_id=$2)`, post.CoverImageID, post.ID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("%w: cover image does not belong to this post", ErrInvalidPublish)
	}
	return nil
}

func (r *BlogRepository) databaseNow(ctx context.Context) (time.Time, error) {
	var now time.Time
	err := r.pool.QueryRow(ctx, `SELECT NOW()`).Scan(&now)
	return now, err
}

func normalizeBlog(post *models.BlogPost) {
	post.Title = strings.TrimSpace(post.Title)
	if strings.TrimSpace(post.BodyHTMLSource) == "" {
		post.BodyHTMLSource = post.BodyHTML
	}
	post.Slug = strings.TrimSpace(strings.ToLower(post.Slug))
	post.Excerpt = strings.TrimSpace(post.Excerpt)
	post.CategoryID = strings.TrimSpace(post.CategoryID)
	post.CoverImageID = strings.TrimSpace(post.CoverImageID)
	post.CoverImageAlt = strings.TrimSpace(post.CoverImageAlt)
	post.OGImageID = strings.TrimSpace(post.OGImageID)
	post.OGImageAlt = strings.TrimSpace(post.OGImageAlt)
	post.FocusKeyword = strings.TrimSpace(post.FocusKeyword)
	post.SEOTitle = strings.TrimSpace(post.SEOTitle)
	post.SEODescription = strings.TrimSpace(post.SEODescription)
	post.AuthorName = strings.TrimSpace(post.AuthorName)
	if post.AuthorName == "" {
		post.AuthorName = "تیم محتوای گلملو"
	}
	post.ReviewerName = strings.TrimSpace(post.ReviewerName)
	post.CTALabel = strings.TrimSpace(post.CTALabel)
	post.CTAText = strings.TrimSpace(post.CTAText)
	post.CTAURL = strings.TrimSpace(post.CTAURL)
	post.Tags = compactStrings(post.Tags)
	post.SecondaryKeywords = compactStrings(post.SecondaryKeywords)
	post.RelatedPostIDs = compactStrings(post.RelatedPostIDs)
	faqs := make([]models.BlogFAQItem, 0, len(post.FAQItems))
	for _, faq := range post.FAQItems {
		faq.Question, faq.Answer = strings.TrimSpace(faq.Question), strings.TrimSpace(faq.Answer)
		if faq.Question != "" && faq.Answer != "" {
			faqs = append(faqs, faq)
		}
	}
	post.FAQItems = faqs
	if post.ReadingTimeMinutes < 1 {
		post.ReadingTimeMinutes = 1
	}
}

func validateBlog(post models.BlogPost) error {
	if post.Title == "" || len([]rune(post.Title)) > 180 || ValidateBlogSlug(post.Slug) != nil || len([]rune(post.Excerpt)) > 500 || len([]rune(post.SEODescription)) > 320 {
		return ErrInvalidBlog
	}
	if post.CTAURL != "" && !(strings.HasPrefix(post.CTAURL, "/") || strings.HasPrefix(post.CTAURL, "https://") || strings.HasPrefix(post.CTAURL, "http://")) {
		return ErrInvalidBlog
	}
	return nil
}

func isEffectivePublished(post models.BlogPost, now time.Time) bool {
	return post.Status == "published" && post.PublishedAt != nil && !post.PublishedAt.After(now) ||
		post.Status == "scheduled" && post.ScheduledFor != nil && !post.ScheduledFor.After(now)
}

func normalizePagination(page, limit int) (int, int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 9
	}
	return page, limit
}

func compactStrings(values []string) []string {
	result := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func normalizePublicBlogSummary(post *models.BlogPostSummary) {
	if post.PublishedAt == nil && post.ScheduledFor != nil {
		publishedAt := *post.ScheduledFor
		post.PublishedAt = &publishedAt
	}
	post.Status = ""
	post.ScheduledFor = nil
}

func scanBlogPost(row pgx.Row) (models.BlogPost, error) {
	var post models.BlogPost
	var tags, secondary, faqs, related []byte
	err := row.Scan(&post.ID, &post.Title, &post.Slug, &post.Excerpt, &post.BodyHTML, &post.BodyHTMLSource, &post.CategoryID, &post.CategoryName,
		&tags, &post.CoverImageID, &post.CoverImageAlt, &post.OGImageID, &post.OGImageAlt, &post.FocusKeyword, &secondary,
		&post.SEOTitle, &post.SEODescription, &post.AuthorName, &post.ReviewerName, &faqs, &related, &post.CTALabel,
		&post.CTAText, &post.CTAURL, &post.Status, &post.ScheduledFor, &post.PublishedAt, &post.ReadingTimeMinutes,
		&post.CreatedAt, &post.UpdatedAt)
	if err != nil {
		return models.BlogPost{}, err
	}
	_ = json.Unmarshal(tags, &post.Tags)
	_ = json.Unmarshal(secondary, &post.SecondaryKeywords)
	_ = json.Unmarshal(faqs, &post.FAQItems)
	_ = json.Unmarshal(related, &post.RelatedPostIDs)
	return post, nil
}

func scanBlogSummaries(rows pgx.Rows) ([]models.BlogPostSummary, error) {
	result := make([]models.BlogPostSummary, 0)
	for rows.Next() {
		var item models.BlogPostSummary
		if err := rows.Scan(&item.ID, &item.Title, &item.Slug, &item.Excerpt, &item.CategoryID, &item.CategoryName,
			&item.CoverImageID, &item.CoverImageAlt, &item.AuthorName, &item.ReadingTimeMinutes, &item.PublishedAt,
			&item.UpdatedAt, &item.Status, &item.ScheduledFor); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func scanCategory(row pgx.Row) (models.BlogCategory, error) {
	var item models.BlogCategory
	err := row.Scan(&item.ID, &item.Name, &item.Slug, &item.Description, &item.SortOrder, &item.IsActive, &item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.BlogCategory{}, ErrNotFound
	}
	return item, err
}

func scanBlogImage(row pgx.Row) (models.BlogImage, error) {
	var image models.BlogImage
	err := row.Scan(&image.ID, &image.BlogID, &image.Filename, &image.Alt, &image.Caption, &image.ContentType, &image.Width, &image.Height, &image.SortOrder, &image.CreatedAt, &image.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.BlogImage{}, ErrNotFound
	}
	return image, err
}
