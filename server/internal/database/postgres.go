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
			phone TEXT NOT NULL,
			course_id TEXT NOT NULL DEFAULT '',
			course_slug TEXT NOT NULL DEFAULT '',
			course_title TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`ALTER TABLE course_signups ADD COLUMN IF NOT EXISTS course_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE course_signups ADD COLUMN IF NOT EXISTS course_slug TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE course_signups ADD COLUMN IF NOT EXISTS course_title TEXT NOT NULL DEFAULT ''`,
		`CREATE INDEX IF NOT EXISTS idx_course_signups_created_at ON course_signups (created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_course_signups_phone ON course_signups (phone)`,
		`CREATE INDEX IF NOT EXISTS idx_course_signups_course_id ON course_signups (course_id)`,
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
			materials JSONB NOT NULL DEFAULT '[]'::jsonb,
			colors JSONB NOT NULL DEFAULT '[]'::jsonb,
			is_customizable BOOLEAN NOT NULL DEFAULT TRUE,
			price_label TEXT NOT NULL DEFAULT '',
			preparation_time TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT 'active',
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_products_status_sort_order ON products (status, sort_order, slug)`,
		`CREATE INDEX IF NOT EXISTS idx_products_cover_image_id ON products (cover_image_id)`,
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
			image_id TEXT NOT NULL DEFAULT '',
			sort_order INTEGER NOT NULL DEFAULT 0,
			outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
			audience JSONB NOT NULL DEFAULT '[]'::jsonb,
			lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`ALTER TABLE courses ADD COLUMN IF NOT EXISTS price_label TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE courses ADD COLUMN IF NOT EXISTS image_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE courses DROP COLUMN IF EXISTS stats`,
		`UPDATE courses SET status = 'in_progress' WHERE status = 'published'`,
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
	}

	for _, query := range statements {
		if _, err := p.pool.Exec(ctx, query); err != nil {
			return fmt.Errorf("create schema: %w", err)
		}
	}

	return nil
}
