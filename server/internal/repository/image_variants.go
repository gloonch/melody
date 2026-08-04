package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"melody-server/internal/media"
	"melody-server/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ImageVariantRepository struct {
	pool *pgxpool.Pool
}

func NewImageVariantRepository(pool *pgxpool.Pool) *ImageVariantRepository {
	return &ImageVariantRepository{pool: pool}
}

func (r *ImageVariantRepository) Replace(ctx context.Context, sourceTable, sourceID, contentType string, data []byte) ([]models.ImageVariant, error) {
	variants, err := media.BuildWebPVariants(data, contentType)
	if err != nil {
		return nil, err
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM image_variants WHERE source_table=$1 AND source_id=$2`, sourceTable, sourceID); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	result := make([]models.ImageVariant, 0, len(variants))
	for _, variant := range variants {
		item := models.ImageVariant{
			ID:          generateID(),
			SourceTable: sourceTable,
			SourceID:    sourceID,
			Width:       variant.Width,
			Height:      variant.Height,
			VariantKey:  "responsive",
			ContentType: "image/webp",
			Data:        variant.Data,
			CreatedAt:   now,
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO image_variants (id, source_table, source_id, width, height, variant_key, content_type, data, created_at)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
			item.ID, item.SourceTable, item.SourceID, item.Width, item.Height, item.VariantKey, item.ContentType, item.Data, item.CreatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *ImageVariantRepository) ReplaceBlog(ctx context.Context, sourceTable, sourceID string, data []byte) ([]models.ImageVariant, error) {
	responsive, err := media.BuildWebPVariantsForWidths(data, media.BlogResponsiveWidths)
	if err != nil {
		return nil, err
	}
	ogData, err := media.BuildBlogOGImage(data)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	items := make([]models.ImageVariant, 0, len(responsive)+1)
	for _, variant := range responsive {
		items = append(items, models.ImageVariant{ID: generateID(), SourceTable: sourceTable, SourceID: sourceID, Width: variant.Width, Height: variant.Height, VariantKey: "responsive", ContentType: "image/webp", Data: variant.Data, CreatedAt: now})
	}
	items = append(items, models.ImageVariant{ID: generateID(), SourceTable: sourceTable, SourceID: sourceID, Width: 1200, Height: 630, VariantKey: "og", ContentType: "image/webp", Data: ogData, CreatedAt: now})

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `DELETE FROM image_variants WHERE source_table=$1 AND source_id=$2`, sourceTable, sourceID); err != nil {
		return nil, err
	}
	for _, item := range items {
		if _, err := tx.Exec(ctx, `INSERT INTO image_variants (id,source_table,source_id,width,height,variant_key,content_type,data,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, item.ID, item.SourceTable, item.SourceID, item.Width, item.Height, item.VariantKey, item.ContentType, item.Data, item.CreatedAt); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return items, nil
}

func (r *ImageVariantRepository) List(ctx context.Context, sourceTable, sourceID string) ([]models.ImageVariant, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, source_table, source_id, width, height, variant_key, content_type, created_at
		 FROM image_variants WHERE source_table=$1 AND source_id=$2 AND variant_key='responsive' ORDER BY width ASC`,
		strings.TrimSpace(sourceTable), strings.TrimSpace(sourceID),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	variants := make([]models.ImageVariant, 0)
	for rows.Next() {
		var variant models.ImageVariant
		if err := rows.Scan(&variant.ID, &variant.SourceTable, &variant.SourceID, &variant.Width, &variant.Height, &variant.VariantKey, &variant.ContentType, &variant.CreatedAt); err != nil {
			return nil, err
		}
		variants = append(variants, variant)
	}
	return variants, rows.Err()
}

func (r *ImageVariantRepository) ListForSources(ctx context.Context, sourceTable string, sourceIDs []string) (map[string][]models.ImageVariant, error) {
	result := make(map[string][]models.ImageVariant, len(sourceIDs))
	if len(sourceIDs) == 0 {
		return result, nil
	}
	rows, err := r.pool.Query(ctx,
		`SELECT id, source_table, source_id, width, height, variant_key, content_type, created_at
		 FROM image_variants
		 WHERE source_table=$1 AND source_id=ANY($2) AND variant_key='responsive'
		 ORDER BY source_id ASC, width ASC`,
		strings.TrimSpace(sourceTable), sourceIDs,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var variant models.ImageVariant
		if err := rows.Scan(&variant.ID, &variant.SourceTable, &variant.SourceID, &variant.Width, &variant.Height, &variant.VariantKey, &variant.ContentType, &variant.CreatedAt); err != nil {
			return nil, err
		}
		result[variant.SourceID] = append(result[variant.SourceID], variant)
	}
	return result, rows.Err()
}

func (r *ImageVariantRepository) Get(ctx context.Context, id string) (models.ImageVariant, error) {
	var variant models.ImageVariant
	err := r.pool.QueryRow(ctx,
		`SELECT id, source_table, source_id, width, height, variant_key, content_type, data, created_at
		 FROM image_variants WHERE id=$1`, strings.TrimSpace(id),
	).Scan(&variant.ID, &variant.SourceTable, &variant.SourceID, &variant.Width, &variant.Height, &variant.VariantKey, &variant.ContentType, &variant.Data, &variant.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.ImageVariant{}, ErrNotFound
	}
	return variant, err
}

func (r *ImageVariantRepository) GetForSourceKey(ctx context.Context, sourceTable, sourceID, variantKey string) (models.ImageVariant, error) {
	var variant models.ImageVariant
	err := r.pool.QueryRow(ctx, `SELECT id,source_table,source_id,width,height,variant_key,content_type,created_at FROM image_variants WHERE source_table=$1 AND source_id=$2 AND variant_key=$3 ORDER BY width DESC LIMIT 1`, strings.TrimSpace(sourceTable), strings.TrimSpace(sourceID), strings.TrimSpace(variantKey)).Scan(&variant.ID, &variant.SourceTable, &variant.SourceID, &variant.Width, &variant.Height, &variant.VariantKey, &variant.ContentType, &variant.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.ImageVariant{}, ErrNotFound
	}
	return variant, err
}

func (r *ImageVariantRepository) DeleteForSource(ctx context.Context, sourceTable, sourceID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM image_variants WHERE source_table=$1 AND source_id=$2`, sourceTable, sourceID)
	return err
}
