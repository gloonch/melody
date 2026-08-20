package httpapi

import (
	"context"

	"melody-server/internal/models"
)

func (h *Handler) attachProductRelations(ctx context.Context, product *models.Product, admin bool) error {
	if admin {
		ids, err := h.contentLinks.BlogIDsForProduct(ctx, product.ID)
		if err != nil {
			return err
		}
		product.RelatedPostIDs = ids
		return nil
	}
	posts, err := h.contentLinks.PublishedBlogsForProduct(ctx, product.ID)
	if err != nil {
		return err
	}
	h.attachBlogSummaryImages(ctx, posts)
	product.RelatedPosts = posts
	product.RelatedPostIDs = make([]string, 0, len(posts))
	for _, post := range posts {
		product.RelatedPostIDs = append(product.RelatedPostIDs, post.ID)
	}
	return nil
}

func (h *Handler) attachBlogRelations(ctx context.Context, post *models.BlogPost, admin bool) error {
	if admin {
		ids, err := h.contentLinks.ProductIDsForBlog(ctx, post.ID)
		if err != nil {
			return err
		}
		post.RelatedProductIDs = ids
		return nil
	}
	products, err := h.contentLinks.ActiveProductsForBlog(ctx, post.ID)
	if err != nil {
		return err
	}
	h.attachProductImages(ctx, products)
	post.RelatedProducts = products
	post.RelatedProductIDs = make([]string, 0, len(products))
	for _, product := range products {
		post.RelatedProductIDs = append(post.RelatedProductIDs, product.ID)
	}
	return nil
}
