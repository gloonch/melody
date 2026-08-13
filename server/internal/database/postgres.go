package database

import (
	"context"
	"fmt"
	"time"

	"melody-server/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresDB struct {
	pool *pgxpool.Pool
}

func NewPostgresDB(cfg config.DatabaseConfig) (*PostgresDB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.ConnectTimeout)*time.Second)
	defer cancel()

	poolConfig, err := pgxpool.ParseConfig(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("parse postgres config: %w", err)
	}
	poolConfig.MaxConns = cfg.MaxPoolSize
	poolConfig.MinConns = cfg.MinPoolSize
	poolConfig.MaxConnIdleTime = 30 * time.Minute
	poolConfig.HealthCheckPeriod = 30 * time.Second

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("connect postgres: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}

	db := &PostgresDB{pool: pool}
	if err := db.createSchema(ctx); err != nil {
		pool.Close()
		return nil, err
	}

	return db, nil
}

func (p *PostgresDB) Close() {
	if p != nil && p.pool != nil {
		p.pool.Close()
	}
}

func (p *PostgresDB) Pool() *pgxpool.Pool {
	return p.pool
}

func (p *PostgresDB) createSchema(ctx context.Context) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS contact_requests (
			id TEXT PRIMARY KEY,
			full_name TEXT NOT NULL,
			contact TEXT NOT NULL,
			message TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON contact_requests (created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_contact_requests_contact ON contact_requests (contact)`,
		`CREATE TABLE IF NOT EXISTS course_signups (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL DEFAULT '',
			phone TEXT NOT NULL,
			course_id TEXT NOT NULL DEFAULT '',
			course_slug TEXT NOT NULL DEFAULT '',
			course_title TEXT NOT NULL DEFAULT '',
			request_type TEXT NOT NULL DEFAULT 'purchase',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`ALTER TABLE course_signups ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE course_signups ADD COLUMN IF NOT EXISTS course_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE course_signups ADD COLUMN IF NOT EXISTS course_slug TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE course_signups ADD COLUMN IF NOT EXISTS course_title TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE course_signups ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'purchase'`,
		`CREATE INDEX IF NOT EXISTS idx_course_signups_created_at ON course_signups (created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_course_signups_phone ON course_signups (phone)`,
		`CREATE INDEX IF NOT EXISTS idx_course_signups_course_id ON course_signups (course_id)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_course_signups_user_course_type ON course_signups (user_id, course_id, request_type) WHERE user_id <> ''`,
		`CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			email TEXT UNIQUE,
			password_hash TEXT NOT NULL,
			full_name TEXT NOT NULL DEFAULT '',
			first_name TEXT NOT NULL DEFAULT '',
			last_name TEXT NOT NULL DEFAULT '',
			phone TEXT NOT NULL UNIQUE,
			birth_date TEXT NOT NULL DEFAULT '',
			instagram TEXT NOT NULL DEFAULT '',
			website TEXT NOT NULL DEFAULT '',
			role TEXT NOT NULL DEFAULT 'user',
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			last_login_at TIMESTAMPTZ
		)`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT NOT NULL DEFAULT ''`,
		`CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone)`,
		`CREATE INDEX IF NOT EXISTS idx_users_active_role ON users (is_active, role)`,
		`CREATE TABLE IF NOT EXISTS refresh_tokens (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			token_hash TEXT NOT NULL UNIQUE,
			expires_at TIMESTAMPTZ NOT NULL,
			revoked_at TIMESTAMPTZ,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash)`,
		`CREATE TABLE IF NOT EXISTS user_addresses (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title TEXT NOT NULL,
			full_address TEXT NOT NULL,
			receiver_name TEXT NOT NULL DEFAULT '',
			receiver_phone TEXT NOT NULL DEFAULT '',
			is_default BOOLEAN NOT NULL DEFAULT FALSE,
			lat DOUBLE PRECISION,
			lng DOUBLE PRECISION,
			map_provider TEXT NOT NULL DEFAULT '',
			place_id TEXT NOT NULL DEFAULT '',
			postal_code TEXT NOT NULL DEFAULT '',
			city TEXT NOT NULL DEFAULT '',
			province TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses (user_id, created_at DESC)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_addresses_one_default ON user_addresses (user_id) WHERE is_default`,
		`CREATE TABLE IF NOT EXISTS project_images (
			id TEXT PRIMARY KEY,
			filename TEXT NOT NULL UNIQUE,
			alt TEXT NOT NULL,
			content_type TEXT NOT NULL,
			data BYTEA NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_project_images_sort_order ON project_images (sort_order, filename)`,
		`CREATE TABLE IF NOT EXISTS product_seed_tombstones (
			project_image_id TEXT PRIMARY KEY REFERENCES project_images(id) ON DELETE CASCADE,
			deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS hero_slides (
			id TEXT PRIMARY KEY,
			filename TEXT NOT NULL UNIQUE,
			alt TEXT NOT NULL,
			content_type TEXT NOT NULL,
			data BYTEA NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_hero_slides_sort_order ON hero_slides (sort_order, filename)`,
		`CREATE TABLE IF NOT EXISTS products (
			id TEXT PRIMARY KEY,
			slug TEXT NOT NULL UNIQUE,
			title TEXT NOT NULL,
			short_description TEXT NOT NULL DEFAULT '',
			description TEXT NOT NULL DEFAULT '',
			cover_image_id TEXT NOT NULL DEFAULT '',
			category TEXT NOT NULL DEFAULT '',
			usage_label TEXT NOT NULL DEFAULT '',
			use_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
			techniques JSONB NOT NULL DEFAULT '[]'::jsonb,
			materials JSONB NOT NULL DEFAULT '[]'::jsonb,
			colors JSONB NOT NULL DEFAULT '[]'::jsonb,
			features JSONB NOT NULL DEFAULT '[]'::jsonb,
			attachment_types JSONB NOT NULL DEFAULT '[]'::jsonb,
			diameter_cm DOUBLE PRECISION,
			has_jewelry_embroidery BOOLEAN NOT NULL DEFAULT FALSE,
			is_customizable BOOLEAN NOT NULL DEFAULT TRUE,
			customizable_color BOOLEAN NOT NULL DEFAULT FALSE,
			customizable_size BOOLEAN NOT NULL DEFAULT FALSE,
			customizable_material BOOLEAN NOT NULL DEFAULT FALSE,
			price_label TEXT NOT NULL DEFAULT '',
			base_price_rial BIGINT NOT NULL DEFAULT 0,
			price_currency TEXT NOT NULL DEFAULT 'IRR',
			availability TEXT NOT NULL DEFAULT 'in_stock',
			preparation_time TEXT NOT NULL DEFAULT '',
			preparation_days INTEGER NOT NULL DEFAULT 1,
			is_featured BOOLEAN NOT NULL DEFAULT FALSE,
			featured_order INTEGER NOT NULL DEFAULT 0,
			seo_title TEXT NOT NULL DEFAULT '',
			seo_description TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT 'active',
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price_rial BIGINT NOT NULL DEFAULT 0`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS price_currency TEXT NOT NULL DEFAULT 'IRR'`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS availability TEXT NOT NULL DEFAULT 'in_stock'`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS preparation_days INTEGER NOT NULL DEFAULT 1`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_order INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS use_cases JSONB NOT NULL DEFAULT '[]'::jsonb`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS techniques JSONB NOT NULL DEFAULT '[]'::jsonb`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '[]'::jsonb`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS attachment_types JSONB NOT NULL DEFAULT '[]'::jsonb`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS diameter_cm DOUBLE PRECISION`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS has_jewelry_embroidery BOOLEAN NOT NULL DEFAULT FALSE`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS customizable_color BOOLEAN NOT NULL DEFAULT FALSE`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS customizable_size BOOLEAN NOT NULL DEFAULT FALSE`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS customizable_material BOOLEAN NOT NULL DEFAULT FALSE`,
		`WITH migration AS (
			INSERT INTO schema_migrations(version) VALUES ('20260813_product_filters_v1')
			ON CONFLICT (version) DO NOTHING
			RETURNING version
		)
		UPDATE products
		SET attachment_types='["pin"]'::jsonb
		WHERE EXISTS (SELECT 1 FROM migration)
		  AND attachment_types='[]'::jsonb
		  AND (title LIKE '%گل سینه%' OR title LIKE '%گل‌سینه%')`,
		`CREATE TABLE IF NOT EXISTS product_slug_history (
			product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
			slug TEXT PRIMARY KEY,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_product_slug_history_product_id ON product_slug_history (product_id, created_at DESC)`,
		`WITH initial_featured AS (
			SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at ASC) AS position
			FROM products
			WHERE status = 'active'
			ORDER BY sort_order ASC, created_at ASC
			LIMIT 3
		)
		UPDATE products p
		SET is_featured = TRUE, featured_order = initial_featured.position
		FROM initial_featured
		WHERE p.id = initial_featured.id
		  AND NOT EXISTS (SELECT 1 FROM products WHERE is_featured = TRUE)`,
		`CREATE INDEX IF NOT EXISTS idx_products_status_sort_order ON products (status, sort_order, slug)`,
		`CREATE INDEX IF NOT EXISTS idx_products_featured ON products (is_featured, featured_order) WHERE status = 'active'`,
		`CREATE INDEX IF NOT EXISTS idx_products_cover_image_id ON products (cover_image_id)`,
		`CREATE TABLE IF NOT EXISTS product_images (
			id TEXT PRIMARY KEY,
			product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
			filename TEXT NOT NULL,
			alt TEXT NOT NULL,
			content_type TEXT NOT NULL,
			data BYTEA NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`ALTER TABLE product_images DROP CONSTRAINT IF EXISTS product_images_product_id_filename_key`,
		`CREATE INDEX IF NOT EXISTS idx_product_images_product_sort_order ON product_images (product_id, sort_order, filename)`,
		`CREATE TABLE IF NOT EXISTS orders (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			type TEXT NOT NULL DEFAULT 'product',
			product_id TEXT REFERENCES products(id) ON DELETE RESTRICT,
			product_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
			status TEXT NOT NULL DEFAULT 'draft',
			usage TEXT NOT NULL DEFAULT '',
			usage_other_text TEXT NOT NULL DEFAULT '',
			preferred_color TEXT NOT NULL DEFAULT '',
			style_note TEXT NOT NULL DEFAULT '',
			quantity INTEGER NOT NULL DEFAULT 1,
			needed_by TEXT NOT NULL DEFAULT '',
			customer_note TEXT NOT NULL DEFAULT '',
			delivery_address_id TEXT REFERENCES user_addresses(id) ON DELETE SET NULL,
			delivery_address_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
			admin_note TEXT NOT NULL DEFAULT '',
			status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			submitted_at TIMESTAMPTZ
		)`,
		`ALTER TABLE orders ALTER COLUMN product_id DROP NOT NULL`,
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'product'`,
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS usage_other_text TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS style_note TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1`,
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address_id TEXT`,
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb`,
		`ALTER TABLE orders ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ`,
		`UPDATE orders SET type = 'product' WHERE type = ''`,
		`UPDATE orders SET submitted_at = created_at WHERE submitted_at IS NULL AND status <> 'draft'`,
		`CREATE INDEX IF NOT EXISTS idx_orders_user_created_at ON orders (user_id, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders (status, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders (product_id)`,
		`CREATE INDEX IF NOT EXISTS idx_orders_type_created_at ON orders (type, created_at DESC)`,
		`CREATE TABLE IF NOT EXISTS order_reference_images (
			id TEXT PRIMARY KEY,
			order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
			filename TEXT NOT NULL,
			content_type TEXT NOT NULL,
			data BYTEA NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_order_reference_images_order_sort ON order_reference_images (order_id, sort_order, created_at)`,
		`CREATE TABLE IF NOT EXISTS courses (
			id TEXT PRIMARY KEY,
			slug TEXT NOT NULL UNIQUE,
			title TEXT NOT NULL,
			subtitle TEXT NOT NULL DEFAULT '',
			term TEXT NOT NULL DEFAULT '',
			level TEXT NOT NULL DEFAULT '',
			format TEXT NOT NULL DEFAULT '',
			duration TEXT NOT NULL DEFAULT '',
			summary TEXT NOT NULL DEFAULT '',
			description TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT 'draft',
			price_label TEXT NOT NULL DEFAULT '',
			base_price_rial BIGINT NOT NULL DEFAULT 0,
			price_currency TEXT NOT NULL DEFAULT 'IRR',
			access_duration TEXT NOT NULL DEFAULT '',
			support_type TEXT NOT NULL DEFAULT '',
			prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
			image_id TEXT NOT NULL DEFAULT '',
			sort_order INTEGER NOT NULL DEFAULT 0,
			outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
			audience JSONB NOT NULL DEFAULT '[]'::jsonb,
			lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`ALTER TABLE courses ADD COLUMN IF NOT EXISTS price_label TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE courses ADD COLUMN IF NOT EXISTS base_price_rial BIGINT NOT NULL DEFAULT 0`,
		`ALTER TABLE courses ADD COLUMN IF NOT EXISTS price_currency TEXT NOT NULL DEFAULT 'IRR'`,
		`ALTER TABLE courses ADD COLUMN IF NOT EXISTS access_duration TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE courses ADD COLUMN IF NOT EXISTS support_type TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb`,
		`ALTER TABLE courses ADD COLUMN IF NOT EXISTS image_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE courses DROP COLUMN IF EXISTS stats`,
		`UPDATE courses
		 SET status = CASE WHEN base_price_rial > 0 THEN 'for_sale' ELSE 'recording' END
		 WHERE status = 'published'`,
		`CREATE INDEX IF NOT EXISTS idx_courses_status_sort_order ON courses (status, sort_order, slug)`,
		`CREATE TABLE IF NOT EXISTS course_accesses (
			id TEXT PRIMARY KEY,
			course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (course_id, user_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_course_accesses_user_id ON course_accesses (user_id, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_course_accesses_course_id ON course_accesses (course_id, created_at DESC)`,
		`CREATE TABLE IF NOT EXISTS course_images (
			id TEXT PRIMARY KEY,
			course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
			filename TEXT NOT NULL,
			alt TEXT NOT NULL,
			content_type TEXT NOT NULL,
			data BYTEA NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (course_id, filename)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_course_images_course_sort_order ON course_images (course_id, sort_order, filename)`,
		`CREATE TABLE IF NOT EXISTS blog_categories (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			slug TEXT NOT NULL UNIQUE,
			description TEXT NOT NULL DEFAULT '',
			sort_order INTEGER NOT NULL DEFAULT 0,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_blog_categories_active_order ON blog_categories (is_active, sort_order, name)`,
		`CREATE TABLE IF NOT EXISTS blog_posts (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			slug TEXT NOT NULL UNIQUE,
			excerpt TEXT NOT NULL DEFAULT '',
			body_html TEXT NOT NULL DEFAULT '',
			body_html_source TEXT NOT NULL DEFAULT '',
			body_json JSONB NOT NULL DEFAULT '{}'::jsonb,
			category_id TEXT REFERENCES blog_categories(id) ON DELETE SET NULL,
			tags JSONB NOT NULL DEFAULT '[]'::jsonb,
			cover_image_id TEXT NOT NULL DEFAULT '',
			cover_image_alt TEXT NOT NULL DEFAULT '',
			og_image_id TEXT NOT NULL DEFAULT '',
			og_image_alt TEXT NOT NULL DEFAULT '',
			focus_keyword TEXT NOT NULL DEFAULT '',
			secondary_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
			seo_title TEXT NOT NULL DEFAULT '',
			seo_description TEXT NOT NULL DEFAULT '',
			author_name TEXT NOT NULL DEFAULT 'تیم محتوای گلملو',
			reviewer_name TEXT NOT NULL DEFAULT '',
			faq_items JSONB NOT NULL DEFAULT '[]'::jsonb,
			related_post_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
			cta_label TEXT NOT NULL DEFAULT '',
			cta_text TEXT NOT NULL DEFAULT '',
			cta_url TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','archived')),
			scheduled_for TIMESTAMPTZ,
			published_at TIMESTAMPTZ,
			reading_time_minutes INTEGER NOT NULL DEFAULT 1,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS body_html_source TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS body_json JSONB NOT NULL DEFAULT '{}'::jsonb`,
		`UPDATE blog_posts SET body_html_source=body_html WHERE body_html_source='' AND body_html<>''`,
		`CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts (status)`,
		`CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled_for ON blog_posts (scheduled_for) WHERE status='scheduled'`,
		`CREATE INDEX IF NOT EXISTS idx_blog_posts_publication ON blog_posts (status, scheduled_for, published_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_blog_posts_effective_published ON blog_posts (published_at DESC) WHERE status='published'`,
		`CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts (category_id, published_at DESC)`,
		`CREATE TABLE IF NOT EXISTS blog_images (
			id TEXT PRIMARY KEY,
			blog_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
			filename TEXT NOT NULL,
			alt TEXT NOT NULL DEFAULT '',
			caption TEXT NOT NULL DEFAULT '',
			content_type TEXT NOT NULL,
			data BYTEA NOT NULL,
			width INTEGER NOT NULL DEFAULT 0,
			height INTEGER NOT NULL DEFAULT 0,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (blog_id, filename)
		)`,
		`ALTER TABLE blog_images ADD COLUMN IF NOT EXISTS width INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE blog_images ADD COLUMN IF NOT EXISTS height INTEGER NOT NULL DEFAULT 0`,
		`CREATE INDEX IF NOT EXISTS idx_blog_images_blog_order ON blog_images (blog_id, sort_order, filename)`,
		`INSERT INTO blog_categories (id,name,slug,description,sort_order,is_active)
		 VALUES ('blog-category-selection-guide','راهنمای انتخاب گل پارچه‌ای','fabric-flower-selection-guide','راهنمای انتخاب مدل، رنگ و اندازه گل پارچه‌ای برای لباس و اکسسوری',10,TRUE)
		 ON CONFLICT DO NOTHING`,
		`CREATE TABLE IF NOT EXISTS blog_slug_history (
			slug TEXT PRIMARY KEY,
			blog_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_blog_slug_history_post ON blog_slug_history (blog_id, created_at DESC)`,
		`CREATE TABLE IF NOT EXISTS image_variants (
			id TEXT PRIMARY KEY,
			source_table TEXT NOT NULL,
			source_id TEXT NOT NULL,
			width INTEGER NOT NULL,
			height INTEGER NOT NULL DEFAULT 0,
			variant_key TEXT NOT NULL DEFAULT 'responsive',
			content_type TEXT NOT NULL DEFAULT 'image/webp',
			data BYTEA NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`ALTER TABLE image_variants ADD COLUMN IF NOT EXISTS height INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE image_variants ADD COLUMN IF NOT EXISTS variant_key TEXT NOT NULL DEFAULT 'responsive'`,
		`ALTER TABLE image_variants DROP CONSTRAINT IF EXISTS image_variants_source_table_source_id_width_key`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_image_variants_unique_source ON image_variants (source_table, source_id, variant_key, width)`,
		`CREATE INDEX IF NOT EXISTS idx_image_variants_source ON image_variants (source_table, source_id, width)`,
		`INSERT INTO schema_migrations (version) VALUES ('20260804_blog_readiness_v1') ON CONFLICT (version) DO NOTHING`,
	}

	for _, query := range statements {
		if _, err := p.pool.Exec(ctx, query); err != nil {
			return fmt.Errorf("create schema: %w", err)
		}
	}

	return p.VerifyBlogSchema(ctx)
}

func (p *PostgresDB) VerifyBlogSchema(ctx context.Context) error {
	objects := []string{
		"product_seed_tombstones",
		"product_images",
		"idx_product_images_product_sort_order",
		"blog_posts",
		"blog_categories",
		"blog_images",
		"blog_slug_history",
		"idx_blog_posts_status",
		"idx_blog_posts_scheduled_for",
		"idx_blog_posts_publication",
		"idx_blog_posts_effective_published",
	}
	for _, object := range objects {
		var relation *string
		if err := p.pool.QueryRow(ctx, `SELECT to_regclass($1)`, object).Scan(&relation); err != nil {
			return fmt.Errorf("verify blog schema %s: %w", object, err)
		}
		if relation == nil {
			return fmt.Errorf("verify blog schema: missing %s", object)
		}
	}
	columns := []struct{ table, column string }{
		{"products", "has_jewelry_embroidery"},
		{"products", "features"},
		{"products", "attachment_types"},
		{"blog_posts", "body_html_source"},
		{"blog_posts", "body_json"},
		{"blog_images", "width"},
		{"blog_images", "height"},
		{"image_variants", "variant_key"},
		{"image_variants", "height"},
	}
	for _, item := range columns {
		var exists bool
		if err := p.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1 AND column_name=$2)`, item.table, item.column).Scan(&exists); err != nil {
			return fmt.Errorf("verify blog schema %s.%s: %w", item.table, item.column, err)
		}
		if !exists {
			return fmt.Errorf("verify blog schema: missing %s.%s", item.table, item.column)
		}
	}
	return nil
}
