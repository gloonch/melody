package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"melody-server/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	ProductStatusActive = "active"
	ProductStatusDraft  = "draft"
)

type ProductRepository struct {
	pool *pgxpool.Pool
}

func NewProductRepository(pool *pgxpool.Pool) *ProductRepository {
	return &ProductRepository{pool: pool}
}

func (r *ProductRepository) SeedFromProjectImages(ctx context.Context) error {
	rows, err := r.pool.Query(
		ctx,
		`SELECT id, alt, sort_order
		 FROM project_images
		 WHERE id NOT IN (SELECT cover_image_id FROM products WHERE cover_image_id <> '')
		 ORDER BY sort_order ASC, filename ASC`,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	images := make([]struct {
		ID        string
		Alt       string
		SortOrder int
	}, 0)
	for rows.Next() {
		var image struct {
			ID        string
			Alt       string
			SortOrder int
		}
		if err := rows.Scan(&image.ID, &image.Alt, &image.SortOrder); err != nil {
			return err
		}
		images = append(images, image)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, image := range images {
		title := strings.TrimSpace(image.Alt)
		if title == "" {
			title = fmt.Sprintf("گل پارچه‌ای سفارشی %d", image.SortOrder+1)
		}

		product := models.Product{
			ID:               "product-" + image.ID,
			Slug:             fmt.Sprintf("fabric-flower-%02d", image.SortOrder+1),
			Title:            title,
			ShortDescription: "گل پارچه‌ای دست‌ساز قابل سفارش برای لباس، کلاه و اکسسوری.",
			Description:      "این محصول به‌صورت سفارشی و بر اساس کاربرد، رنگ و جزئیات موردنیاز شما بررسی و آماده‌سازی می‌شود.",
			CoverImageID:     image.ID,
			Category:         "گل پارچه‌ای سفارشی",
			UsageLabel:       "لباس، کلاه، سنجاق سینه و اکسسوری",
			Materials:        []string{"پارچه", "نخ", "سیم گل‌سازی", "جزئیات تزئینی"},
			Colors:           []string{"سفارشی"},
			IsCustomizable:   true,
			PriceLabel:       "پس از بررسی اعلام می‌شود",
			PreparationTime:  "زمان آماده‌سازی پس از بررسی اعلام می‌شود",
			Status:           ProductStatusActive,
			SortOrder:        image.SortOrder,
		}
		if _, err := r.CreateProduct(ctx, product); err != nil && !isUniqueViolationCode(err) {
			return err
		}
	}

	return nil
}

func (r *ProductRepository) ListProducts(ctx context.Context, includeDrafts bool) ([]models.Product, error) {
	rows, err := r.pool.Query(
		ctx,
		`SELECT id, slug, title, short_description, description, cover_image_id, category, usage_label,
			materials, colors, is_customizable, price_label, preparation_time, status, sort_order, created_at, updated_at
		 FROM products
		 WHERE ($1 OR status = 'active')
		 ORDER BY sort_order ASC, created_at ASC`,
		includeDrafts,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := make([]models.Product, 0)
	for rows.Next() {
		product, err := scanProduct(rows)
		if err != nil {
			return nil, err
		}
		products = append(products, product)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return products, nil
}

func (r *ProductRepository) GetProduct(ctx context.Context, idOrSlug string, includeDrafts bool) (models.Product, error) {
	row := r.pool.QueryRow(
		ctx,
		`SELECT id, slug, title, short_description, description, cover_image_id, category, usage_label,
			materials, colors, is_customizable, price_label, preparation_time, status, sort_order, created_at, updated_at
		 FROM products
		 WHERE (id = $1 OR slug = $1) AND ($2 OR status = 'active')
		 LIMIT 1`,
		strings.TrimSpace(idOrSlug),
		includeDrafts,
	)
	product, err := scanProduct(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Product{}, ErrNotFound
	}
	return product, err
}

func (r *ProductRepository) CreateProduct(ctx context.Context, product models.Product) (models.Product, error) {
	normalizeProduct(&product)
	if product.ID == "" {
		product.ID = generateID()
	}
	now := time.Now().UTC()
	product.CreatedAt = now
	product.UpdatedAt = now

	_, err := r.pool.Exec(
		ctx,
		`INSERT INTO products (
			id, slug, title, short_description, description, cover_image_id, category, usage_label,
			materials, colors, is_customizable, price_label, preparation_time, status, sort_order, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
		product.ID,
		product.Slug,
		product.Title,
		product.ShortDescription,
		product.Description,
		product.CoverImageID,
		product.Category,
		product.UsageLabel,
		mustJSON(product.Materials),
		mustJSON(product.Colors),
		product.IsCustomizable,
		product.PriceLabel,
		product.PreparationTime,
		product.Status,
		product.SortOrder,
		product.CreatedAt,
		product.UpdatedAt,
	)
	return product, err
}

func scanProduct(scanner interface {
	Scan(dest ...any) error
}) (models.Product, error) {
	var product models.Product
	var materialsJSON []byte
	var colorsJSON []byte

	err := scanner.Scan(
		&product.ID,
		&product.Slug,
		&product.Title,
		&product.ShortDescription,
		&product.Description,
		&product.CoverImageID,
		&product.Category,
		&product.UsageLabel,
		&materialsJSON,
		&colorsJSON,
		&product.IsCustomizable,
		&product.PriceLabel,
		&product.PreparationTime,
		&product.Status,
		&product.SortOrder,
		&product.CreatedAt,
		&product.UpdatedAt,
	)
	if err != nil {
		return models.Product{}, err
	}
	if err := json.Unmarshal(materialsJSON, &product.Materials); err != nil {
		return models.Product{}, err
	}
	if err := json.Unmarshal(colorsJSON, &product.Colors); err != nil {
		return models.Product{}, err
	}
	return product, nil
}

func normalizeProduct(product *models.Product) {
	product.ID = strings.TrimSpace(product.ID)
	product.Slug = strings.TrimSpace(product.Slug)
	product.Title = strings.TrimSpace(product.Title)
	product.ShortDescription = strings.TrimSpace(product.ShortDescription)
	product.Description = strings.TrimSpace(product.Description)
	product.CoverImageID = strings.TrimSpace(product.CoverImageID)
	product.Category = strings.TrimSpace(product.Category)
	product.UsageLabel = strings.TrimSpace(product.UsageLabel)
	product.PriceLabel = strings.TrimSpace(product.PriceLabel)
	product.PreparationTime = strings.TrimSpace(product.PreparationTime)
	product.Status = strings.TrimSpace(product.Status)

	if product.Slug == "" {
		product.Slug = product.ID
	}
	if product.Title == "" {
		product.Title = "گل پارچه‌ای سفارشی"
	}
	if product.ShortDescription == "" {
		product.ShortDescription = "گل پارچه‌ای دست‌ساز قابل سفارش."
	}
	if product.Description == "" {
		product.Description = product.ShortDescription
	}
	if product.Category == "" {
		product.Category = "گل پارچه‌ای"
	}
	if product.PriceLabel == "" {
		product.PriceLabel = "پس از بررسی اعلام می‌شود"
	}
	if product.PreparationTime == "" {
		product.PreparationTime = "پس از بررسی اعلام می‌شود"
	}
	if product.Status == "" {
		product.Status = ProductStatusActive
	}
	switch product.Status {
	case ProductStatusActive, ProductStatusDraft:
	default:
		product.Status = ProductStatusActive
	}
	if product.Materials == nil {
		product.Materials = []string{}
	}
	if product.Colors == nil {
		product.Colors = []string{}
	}
}

func isUniqueViolationCode(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}
