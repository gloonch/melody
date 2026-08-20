package repository

import (
	"context"
	"errors"
	"strings"

	"melody-server/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const MaxRelatedContentItems = 3

var ErrTooManyRelatedItems = errors.New("at most three related items are allowed")

type BlogProductLinkRepository struct {
	pool *pgxpool.Pool
}

func NewBlogProductLinkRepository(pool *pgxpool.Pool) *BlogProductLinkRepository {
	return &BlogProductLinkRepository{pool: pool}
}

func (r *BlogProductLinkRepository) ReplaceForProduct(ctx context.Context, productID string, blogIDs []string) error {
	blogIDs, err := normalizeRelatedIDs(blogIDs)
	if err != nil {
		return err
	}
	return r.replace(ctx, "product", strings.TrimSpace(productID), blogIDs)
}

func (r *BlogProductLinkRepository) ReplaceForBlog(ctx context.Context, blogID string, productIDs []string) error {
	productIDs, err := normalizeRelatedIDs(productIDs)
	if err != nil {
		return err
	}
	return r.replace(ctx, "blog", strings.TrimSpace(blogID), productIDs)
}

func (r *BlogProductLinkRepository) replace(ctx context.Context, ownerType, ownerID string, relatedIDs []string) error {
	if ownerID == "" {
		return ErrNotFound
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if ownerType == "product" {
		if err := ensureRowExists(ctx, tx, "products", ownerID); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM blog_product_links WHERE product_id=$1`, ownerID); err != nil {
			return err
		}
		for index, blogID := range relatedIDs {
			if err := ensureRowExists(ctx, tx, "blog_posts", blogID); err != nil {
				return err
			}
			if err := ensureRelatedCapacity(ctx, tx, "blog_post_id", blogID); err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, `INSERT INTO blog_product_links (blog_post_id,product_id,sort_order) VALUES ($1,$2,$3)`, blogID, ownerID, index); err != nil {
				return err
			}
		}
	} else {
		if err := ensureRowExists(ctx, tx, "blog_posts", ownerID); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM blog_product_links WHERE blog_post_id=$1`, ownerID); err != nil {
			return err
		}
		for index, productID := range relatedIDs {
			if err := ensureRowExists(ctx, tx, "products", productID); err != nil {
				return err
			}
			if err := ensureRelatedCapacity(ctx, tx, "product_id", productID); err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, `INSERT INTO blog_product_links (blog_post_id,product_id,sort_order) VALUES ($1,$2,$3)`, ownerID, productID, index); err != nil {
				return err
			}
		}
	}
	return tx.Commit(ctx)
}

func (r *BlogProductLinkRepository) BlogIDsForProduct(ctx context.Context, productID string) ([]string, error) {
	return r.relatedIDs(ctx, `SELECT blog_post_id FROM blog_product_links WHERE product_id=$1 ORDER BY sort_order,blog_post_id`, productID)
}

func (r *BlogProductLinkRepository) ProductIDsForBlog(ctx context.Context, blogID string) ([]string, error) {
	return r.relatedIDs(ctx, `SELECT product_id FROM blog_product_links WHERE blog_post_id=$1 ORDER BY sort_order,product_id`, blogID)
}

func (r *BlogProductLinkRepository) relatedIDs(ctx context.Context, query, ownerID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, query, strings.TrimSpace(ownerID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := make([]string, 0, MaxRelatedContentItems)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *BlogProductLinkRepository) PublishedBlogsForProduct(ctx context.Context, productID string) ([]models.BlogPostSummary, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+blogSummaryColumns+`
		FROM blog_product_links l
		JOIN blog_posts p ON p.id=l.blog_post_id
		LEFT JOIN blog_categories c ON c.id=p.category_id
		WHERE l.product_id=$1 AND `+publicBlogPredicate+`
		ORDER BY l.sort_order,p.published_at DESC LIMIT $2`, strings.TrimSpace(productID), MaxRelatedContentItems)
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

func (r *BlogProductLinkRepository) ActiveProductsForBlog(ctx context.Context, blogID string) ([]models.Product, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+productColumns+`
		FROM blog_product_links l JOIN products ON products.id=l.product_id
		WHERE l.blog_post_id=$1 AND products.status='active'
		ORDER BY l.sort_order,products.sort_order,products.created_at LIMIT $2`, strings.TrimSpace(blogID), MaxRelatedContentItems)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	products := make([]models.Product, 0, MaxRelatedContentItems)
	for rows.Next() {
		product, err := scanProduct(rows)
		if err != nil {
			return nil, err
		}
		products = append(products, product)
	}
	return products, rows.Err()
}

func normalizeRelatedIDs(values []string) ([]string, error) {
	result := compactStrings(values)
	if len(result) > MaxRelatedContentItems {
		return nil, ErrTooManyRelatedItems
	}
	return result, nil
}

func ensureRowExists(ctx context.Context, tx pgx.Tx, table, id string) error {
	query := `SELECT 1 FROM ` + table + ` WHERE id=$1`
	var exists int
	if err := tx.QueryRow(ctx, query, id).Scan(&exists); errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	} else {
		return err
	}
}

func ensureRelatedCapacity(ctx context.Context, tx pgx.Tx, column, id string) error {
	query := `SELECT COUNT(*) FROM blog_product_links WHERE ` + column + `=$1`
	var count int
	if err := tx.QueryRow(ctx, query, id).Scan(&count); err != nil {
		return err
	}
	if count >= MaxRelatedContentItems {
		return ErrTooManyRelatedItems
	}
	return nil
}
