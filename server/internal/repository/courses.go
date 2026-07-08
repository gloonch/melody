package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"melody-server/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

type CourseRepository struct {
	pool *pgxpool.Pool
}

func NewCourseRepository(pool *pgxpool.Pool) *CourseRepository {
	return &CourseRepository{pool: pool}
}

func (r *CourseRepository) SeedDefaultCourse(ctx context.Context) error {
	course := DefaultCourse()
	_, err := r.pool.Exec(
		ctx,
		`INSERT INTO courses (
			id, slug, title, subtitle, term, level, format, duration, summary, description,
			status, price_label, image_id, sort_order, outcomes, audience, lessons, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
		ON CONFLICT (slug) DO NOTHING`,
		course.ID,
		course.Slug,
		course.Title,
		course.Subtitle,
		course.Term,
		course.Level,
		course.Format,
		course.Duration,
		course.Summary,
		course.Description,
		course.Status,
		course.PriceLabel,
		course.ImageID,
		course.SortOrder,
		mustJSON(course.Outcomes),
		mustJSON(course.Audience),
		mustJSON(course.Lessons),
		course.CreatedAt,
		course.UpdatedAt,
	)
	return err
}

func (r *CourseRepository) ListCourses(ctx context.Context, includeDrafts bool) ([]models.Course, error) {
	rows, err := r.pool.Query(
		ctx,
		`SELECT id, slug, title, subtitle, term, level, format, duration, summary, description,
			status, price_label, image_id, sort_order, outcomes, audience, lessons, created_at, updated_at
		 FROM courses
		 WHERE ($1 OR status NOT IN ('draft', 'archived'))
		 ORDER BY sort_order ASC, slug ASC`,
		includeDrafts,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	courses := make([]models.Course, 0)
	for rows.Next() {
		course, err := scanCourse(rows)
		if err != nil {
			return nil, err
		}
		courses = append(courses, course)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return courses, nil
}

func (r *CourseRepository) GetCourse(ctx context.Context, idOrSlug string, includeDrafts bool) (models.Course, error) {
	row := r.pool.QueryRow(
		ctx,
		`SELECT id, slug, title, subtitle, term, level, format, duration, summary, description,
			status, price_label, image_id, sort_order, outcomes, audience, lessons, created_at, updated_at
		 FROM courses
		 WHERE (id = $1 OR slug = $1) AND ($2 OR status NOT IN ('draft', 'archived'))
		 LIMIT 1`,
		idOrSlug,
		includeDrafts,
	)
	course, err := scanCourse(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Course{}, ErrNotFound
	}
	return course, err
}

func (r *CourseRepository) CreateCourse(ctx context.Context, course models.Course) (models.Course, error) {
	normalizeCourse(&course)
	if course.ID == "" {
		course.ID = generateID()
	}
	now := time.Now().UTC()
	course.CreatedAt = now
	course.UpdatedAt = now

	_, err := r.pool.Exec(
		ctx,
		`INSERT INTO courses (
			id, slug, title, subtitle, term, level, format, duration, summary, description,
			status, price_label, image_id, sort_order, outcomes, audience, lessons, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
		course.ID,
		course.Slug,
		course.Title,
		course.Subtitle,
		course.Term,
		course.Level,
		course.Format,
		course.Duration,
		course.Summary,
		course.Description,
		course.Status,
		course.PriceLabel,
		course.ImageID,
		course.SortOrder,
		mustJSON(course.Outcomes),
		mustJSON(course.Audience),
		mustJSON(course.Lessons),
		course.CreatedAt,
		course.UpdatedAt,
	)
	return course, err
}

func (r *CourseRepository) UpdateCourse(ctx context.Context, id string, course models.Course) (models.Course, error) {
	normalizeCourse(&course)
	course.ID = id
	course.UpdatedAt = time.Now().UTC()

	row := r.pool.QueryRow(
		ctx,
		`UPDATE courses SET
			slug = $2,
			title = $3,
			subtitle = $4,
			term = $5,
			level = $6,
			format = $7,
			duration = $8,
			summary = $9,
			description = $10,
			status = $11,
			price_label = $12,
			image_id = $13,
			sort_order = $14,
			outcomes = $15,
			audience = $16,
			lessons = $17,
			updated_at = $18
		 WHERE id = $1
		 RETURNING id, slug, title, subtitle, term, level, format, duration, summary, description,
			status, price_label, image_id, sort_order, outcomes, audience, lessons, created_at, updated_at`,
		course.ID,
		course.Slug,
		course.Title,
		course.Subtitle,
		course.Term,
		course.Level,
		course.Format,
		course.Duration,
		course.Summary,
		course.Description,
		course.Status,
		course.PriceLabel,
		course.ImageID,
		course.SortOrder,
		mustJSON(course.Outcomes),
		mustJSON(course.Audience),
		mustJSON(course.Lessons),
		course.UpdatedAt,
	)
	updated, err := scanCourse(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Course{}, ErrNotFound
	}
	return updated, err
}

func (r *CourseRepository) ListAccesses(ctx context.Context, courseID string) ([]models.CourseAccess, error) {
	rows, err := r.pool.Query(
		ctx,
		`SELECT ca.id, ca.course_id, ca.user_id, COALESCE(u.full_name, ''), COALESCE(u.phone, ''), ca.created_at
		 FROM course_accesses ca
		 JOIN users u ON u.id = ca.user_id
		 WHERE ca.course_id = $1
		 ORDER BY ca.created_at DESC`,
		strings.TrimSpace(courseID),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	accesses := make([]models.CourseAccess, 0)
	for rows.Next() {
		var access models.CourseAccess
		if err := rows.Scan(&access.ID, &access.CourseID, &access.UserID, &access.UserName, &access.UserPhone, &access.CreatedAt); err != nil {
			return nil, err
		}
		accesses = append(accesses, access)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return accesses, nil
}

func (r *CourseRepository) ListAccessIDsByUser(ctx context.Context, userID string) ([]string, error) {
	rows, err := r.pool.Query(
		ctx,
		`SELECT c.id, c.slug
		 FROM course_accesses ca
		 JOIN courses c ON c.id = ca.course_id
		 WHERE ca.user_id = $1
		 ORDER BY ca.created_at DESC`,
		strings.TrimSpace(userID),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]string, 0)
	seen := make(map[string]struct{})
	for rows.Next() {
		var id string
		var slug string
		if err := rows.Scan(&id, &slug); err != nil {
			return nil, err
		}
		for _, value := range []string{id, slug} {
			value = strings.TrimSpace(value)
			if value == "" {
				continue
			}
			if _, ok := seen[value]; ok {
				continue
			}
			seen[value] = struct{}{}
			ids = append(ids, value)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return ids, nil
}

func (r *CourseRepository) GrantAccess(ctx context.Context, courseID string, userID string) (models.CourseAccess, error) {
	now := time.Now().UTC()
	access := models.CourseAccess{
		ID:        generateID(),
		CourseID:  strings.TrimSpace(courseID),
		UserID:    strings.TrimSpace(userID),
		CreatedAt: now,
	}

	row := r.pool.QueryRow(
		ctx,
		`INSERT INTO course_accesses (id, course_id, user_id, created_at)
		 VALUES ($1,$2,$3,$4)
		 ON CONFLICT (course_id, user_id) DO UPDATE SET course_id = EXCLUDED.course_id
		 RETURNING id, course_id, user_id, created_at`,
		access.ID,
		access.CourseID,
		access.UserID,
		access.CreatedAt,
	)
	err := row.Scan(&access.ID, &access.CourseID, &access.UserID, &access.CreatedAt)
	return access, err
}

func (r *CourseRepository) RevokeAccess(ctx context.Context, courseID string, accessID string) error {
	result, err := r.pool.Exec(
		ctx,
		`DELETE FROM course_accesses WHERE course_id = $1 AND id = $2`,
		strings.TrimSpace(courseID),
		strings.TrimSpace(accessID),
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *CourseRepository) DeleteCourse(ctx context.Context, id string) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM courses WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *CourseRepository) ListImages(ctx context.Context, courseID string) ([]models.CourseImage, error) {
	rows, err := r.pool.Query(
		ctx,
		`SELECT id, course_id, filename, alt, content_type, sort_order, created_at
		 FROM course_images
		 WHERE course_id = $1
		 ORDER BY sort_order ASC, filename ASC`,
		courseID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	images := make([]models.CourseImage, 0)
	for rows.Next() {
		var image models.CourseImage
		if err := rows.Scan(&image.ID, &image.CourseID, &image.Filename, &image.Alt, &image.ContentType, &image.SortOrder, &image.CreatedAt); err != nil {
			return nil, err
		}
		images = append(images, image)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return images, nil
}

func (r *CourseRepository) CreateImage(ctx context.Context, image models.CourseImage) (models.CourseImage, error) {
	if image.ID == "" {
		image.ID = generateID()
	}
	if image.CreatedAt.IsZero() {
		image.CreatedAt = time.Now().UTC()
	}
	if image.SortOrder < 0 {
		image.SortOrder = 0
	}

	_, err := r.pool.Exec(
		ctx,
		`INSERT INTO course_images (id, course_id, filename, alt, content_type, data, sort_order, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		image.ID,
		image.CourseID,
		image.Filename,
		image.Alt,
		image.ContentType,
		image.Data,
		image.SortOrder,
		image.CreatedAt,
	)
	return image, err
}

func (r *CourseRepository) GetImageContent(ctx context.Context, courseID string, imageID string) (models.CourseImage, error) {
	var image models.CourseImage
	err := r.pool.QueryRow(
		ctx,
		`SELECT id, course_id, filename, alt, content_type, data, sort_order, created_at
		 FROM course_images
		 WHERE course_id = $1 AND id = $2`,
		courseID,
		imageID,
	).Scan(&image.ID, &image.CourseID, &image.Filename, &image.Alt, &image.ContentType, &image.Data, &image.SortOrder, &image.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.CourseImage{}, ErrNotFound
	}
	return image, err
}

func (r *CourseRepository) DeleteImage(ctx context.Context, courseID string, imageID string) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM course_images WHERE course_id = $1 AND id = $2`, courseID, imageID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanCourse(scanner interface {
	Scan(dest ...any) error
}) (models.Course, error) {
	var course models.Course
	var outcomesJSON []byte
	var audienceJSON []byte
	var lessonsJSON []byte

	err := scanner.Scan(
		&course.ID,
		&course.Slug,
		&course.Title,
		&course.Subtitle,
		&course.Term,
		&course.Level,
		&course.Format,
		&course.Duration,
		&course.Summary,
		&course.Description,
		&course.Status,
		&course.PriceLabel,
		&course.ImageID,
		&course.SortOrder,
		&outcomesJSON,
		&audienceJSON,
		&lessonsJSON,
		&course.CreatedAt,
		&course.UpdatedAt,
	)
	if err != nil {
		return models.Course{}, err
	}
	if err := json.Unmarshal(outcomesJSON, &course.Outcomes); err != nil {
		return models.Course{}, err
	}
	if err := json.Unmarshal(audienceJSON, &course.Audience); err != nil {
		return models.Course{}, err
	}
	if err := json.Unmarshal(lessonsJSON, &course.Lessons); err != nil {
		return models.Course{}, err
	}

	return course, nil
}

func normalizeCourse(course *models.Course) {
	course.ID = strings.TrimSpace(course.ID)
	course.Slug = strings.TrimSpace(course.Slug)
	course.Title = strings.TrimSpace(course.Title)
	course.Subtitle = strings.TrimSpace(course.Subtitle)
	course.Term = strings.TrimSpace(course.Term)
	course.Level = strings.TrimSpace(course.Level)
	course.Format = strings.TrimSpace(course.Format)
	course.Duration = strings.TrimSpace(course.Duration)
	course.Summary = strings.TrimSpace(course.Summary)
	course.Description = strings.TrimSpace(course.Description)
	course.Status = strings.TrimSpace(course.Status)
	course.PriceLabel = strings.TrimSpace(course.PriceLabel)
	course.ImageID = strings.TrimSpace(course.ImageID)
	for index := range course.Lessons {
		course.Lessons[index].ID = strings.TrimSpace(course.Lessons[index].ID)
		course.Lessons[index].ChapterID = strings.TrimSpace(course.Lessons[index].ChapterID)
		course.Lessons[index].ChapterTitle = strings.TrimSpace(course.Lessons[index].ChapterTitle)
		course.Lessons[index].Title = strings.TrimSpace(course.Lessons[index].Title)
		course.Lessons[index].Level = strings.TrimSpace(course.Lessons[index].Level)
		course.Lessons[index].Type = strings.TrimSpace(course.Lessons[index].Type)
		course.Lessons[index].Duration = strings.TrimSpace(course.Lessons[index].Duration)
		course.Lessons[index].Summary = strings.TrimSpace(course.Lessons[index].Summary)
		course.Lessons[index].Body = strings.TrimSpace(course.Lessons[index].Body)
		course.Lessons[index].VideoURL = strings.TrimSpace(course.Lessons[index].VideoURL)
		course.Lessons[index].ImageID = strings.TrimSpace(course.Lessons[index].ImageID)
		if course.Lessons[index].ChapterTitle == "" {
			course.Lessons[index].ChapterTitle = "سرفصل‌ها"
		}
		if course.Lessons[index].ChapterID == "" {
			course.Lessons[index].ChapterID = slugLike(course.Lessons[index].ChapterTitle)
		}
	}

	if course.Slug == "" {
		course.Slug = course.ID
	}
	if course.Status == "" {
		course.Status = "recording"
	}
	switch course.Status {
	case "recording", "for_sale", "sold_out", "in_progress", "in_production", "completed", "draft", "archived":
	default:
		course.Status = "recording"
	}
}

func slugLike(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "chapter"
	}
	replacer := strings.NewReplacer(" ", "-", "/", "-", "\\", "-", "_", "-")
	return strings.ToLower(replacer.Replace(value))
}

func mustJSON(value any) []byte {
	data, err := json.Marshal(value)
	if err != nil {
		return []byte("[]")
	}
	return data
}

func generateID() string {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("id-%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}

func DefaultCourse() models.Course {
	now := time.Now().UTC()
	return models.Course{
		ID:          "01",
		Slug:        "01",
		Title:       "دوره مقدماتی گل‌سازی پارچه‌ای",
		Subtitle:    "یادگیری ۵ گل پارچه‌ای به‌صورت ویدیویی، از مدل‌های ساده‌تر تا فرم‌های پیچیده‌تر.",
		Term:        "ترم ۰۱",
		Level:       "مقدماتی",
		Format:      "ویدیویی",
		Duration:    "از آسان تا سخت",
		Summary:     "یادگیری ۵ گل پارچه‌ای به‌صورت ویدیویی، با مسیری که از مدل‌های ساده‌تر شروع می‌شود و قدم‌به‌قدم به ساخت فرم‌های پیچیده‌تر می‌رسد.",
		Description: "در ترم اول، هنرجو ساخت ۵ گل پارچه‌ای را به‌صورت ویدیویی و مرحله‌به‌مرحله یاد می‌گیرد؛ مسیری آرام و منظم که از مدل‌های ساده‌تر آغاز می‌شود و به فرم‌های پیچیده‌تر و حرفه‌ای‌تر می‌رسد.",
		Status:      "in_progress",
		PriceLabel:  "پس از بررسی اعلام می‌شود",
		SortOrder:   1,
		Outcomes: []string{
			"آشنایی با ۵ مدل گل پارچه‌ای",
			"یادگیری از سطح آسان تا سخت",
			"شناخت متریال و ابزار پایه گل‌سازی",
			"آشنایی با گل‌های کیریشه و حریری",
			"تمرین فرم‌دهی، لایه‌سازی و اجرای جزئیات",
		},
		Audience: []string{
			"هنرجویان مبتدی و علاقه‌مند به گل‌سازی پارچه‌ای",
			"کسانی که می‌خواهند اصول اولیه را درست و مرحله‌به‌مرحله یاد بگیرند",
			"افرادی که قصد دارند از مدل‌های ساده‌تر به فرم‌های پیچیده‌تر برسند",
		},
		Lessons: []models.CourseLesson{
			{ID: "01", Title: "نسترن", Level: "آسان", Type: "کیریشه", Duration: "کمتر از ۱ ساعت", Summary: "شروعی آرام برای ورود به دنیای گل‌سازی پارچه‌ای؛ مناسب برای آشنایی با فرم‌دهی اولیه، جزئیات تزئینی و کنترل بافت.", Materials: []string{"پارچه ساتن آمریکایی", "ساتن مرلین", "مخمل کش کره‌ای", "چسب", "کارگاه گل‌سازی", "نخ و سوزن", "سیم گل‌سازی سایز ۵ یا ۷", "مروارید، کریستال و سنگ پایه‌دار"}},
			{ID: "02", Title: "داوودی", Level: "متوسط", Type: "کیریشه", Duration: "کمتر از ۱ ساعت", Summary: "تمرکز بر لایه‌سازی و ساخت فرم‌های پرتر؛ برای شناخت بهتر ساختار گل و هماهنگی بافت‌ها در گل‌های کیریشه.", Materials: []string{"ساتن مرلین", "مخمل کره‌ای", "زانفیکس متری", "نخ", "چسب حرارتی"}},
			{ID: "03", Title: "لیلیوم", Level: "متوسط", Type: "کیریشه", Duration: "کمتر از ۱ ساعت", Summary: "آشنایی بیشتر با فرم گلبرگ‌های متفاوت، کار با سیم و ساختاردهی دقیق‌تر در یک مدل میانی و کاربردی.", Materials: []string{"ساتن مرلین", "ساتن آمریکایی", "نخ و سوزن", "کارگاه گل‌سازی", "سیم گل‌سازی سایز ۵ یا ۷"}},
			{ID: "04", Title: "رز", Level: "متوسط", Type: "کیریشه", Duration: "حدود ۱ ساعت", Summary: "یکی از مهم‌ترین فرم‌ها در گل‌سازی پارچه‌ای؛ با تمرکز بر حجم‌دهی، ترکیب لایه‌ها و اجرای کامل‌تر ساختار گل.", Materials: []string{"ساتن مرلین", "تافته", "زانفیکس", "کارگاه گل‌سازی", "نخ و سوزن", "چسب داغ", "پنبه", "آستر"}},
			{ID: "05", Title: "رز حلزونی", Level: "سخت", Type: "حریری", Duration: "۱ ساعت و ۳۰ دقیقه", Summary: "پیشرفته‌ترین آموزش ترم اول؛ برای تجربه‌ی کنترل فرم در گل‌های حریری، اجرای لایه‌های پیچیده‌تر و رسیدن به ظرافت حرفه‌ای‌تر.", Materials: []string{"قیچی", "کاغذ مقوا", "اتو", "نخ و سوزن همرنگ پارچه", "پارچه‌های سیدان", "حریر ایتالیایی", "ارگاندی", "ساتن مرلین", "روبان ۸ سانتی‌متری"}},
		},
		CreatedAt: now,
		UpdatedAt: now,
	}
}
