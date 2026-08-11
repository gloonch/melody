package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"melody-server/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	ProductStatusActive   = "active"
	ProductStatusDraft    = "draft"
	ProductStatusArchived = "archived"

	ProductAvailabilityInStock     = "in_stock"
	ProductAvailabilityMadeToOrder = "made_to_order"
	ProductAvailabilityOutOfStock  = "out_of_stock"
)

var ErrFeaturedLimit = errors.New("at most three products can be featured")
var ErrProductSlugTaken = errors.New("product slug is already in use")

const productColumns = `id, slug, title, short_description, description, cover_image_id, category, usage_label,
	use_cases, techniques, materials, colors, diameter_cm, is_customizable, customizable_color,
	customizable_size, customizable_material, price_label, base_price_rial, price_currency, availability,
	preparation_time, preparation_days, is_featured, featured_order, seo_title, seo_description,
	status, sort_order, created_at, updated_at`

var validProductUseCases = map[string]struct{}{
	"evening_dress": {}, "wedding_dress": {}, "coat_manto": {}, "hat": {}, "hair_accessory": {}, "multipurpose": {},
}

var validProductTechniques = map[string]struct{}{
	"kerisheh": {}, "fashion": {}, "stumpwork": {}, "classic": {}, "three_dimensional": {},
}

var validProductMaterials = map[string]struct{}{
	"chiffon": {}, "satin": {}, "organza": {}, "velvet": {}, "tulle": {}, "crepe": {}, "mixed": {},
}

var validProductColors = map[string]struct{}{
	"white": {}, "black": {}, "cream": {}, "ivory": {}, "pink": {}, "red": {}, "blue": {}, "green": {},
	"gold": {}, "silver": {}, "purple": {}, "multicolor": {},
}

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
			title = fmt.Sprintf("گل پارچه‌ای %d", image.SortOrder+1)
		}

		product := models.Product{
			ID:               "product-" + image.ID,
			Slug:             fmt.Sprintf("fabric-flower-%02d", image.SortOrder+1),
			Title:            title,
			ShortDescription: "اطلاعات این گل پارچه‌ای در پنل مدیریت تکمیل می‌شود.",
			Description:      "برای انتشار محصول، نام، توضیحات، کاربرد، قیمت پایه و وضعیت موجودی را تکمیل کنید.",
			CoverImageID:     image.ID,
			Category:         "گل پارچه‌ای",
			UsageLabel:       "",
			Materials:        []string{},
			Colors:           []string{},
			IsCustomizable:   true,
			PriceCurrency:    "IRR",
			Availability:     ProductAvailabilityInStock,
			PreparationDays:  1,
			Status:           ProductStatusDraft,
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
		`SELECT `+productColumns+`
		 FROM products
		 WHERE ($1 OR status = 'active')
		 ORDER BY is_featured DESC, featured_order ASC, sort_order ASC, created_at ASC`,
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
		`SELECT `+productColumns+`
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

func (r *ProductRepository) GetProductByHistoricalSlug(ctx context.Context, slug string, includeDrafts bool) (models.Product, error) {
	row := r.pool.QueryRow(
		ctx,
		`SELECT `+productColumns+`
		 FROM products
		 WHERE id = (SELECT product_id FROM product_slug_history WHERE slug = $1)
		   AND ($2 OR status = 'active')
		 LIMIT 1`,
		strings.TrimSpace(slug),
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
	if err := ValidateProduct(product); err != nil {
		return models.Product{}, err
	}

	now := time.Now().UTC()
	product.CreatedAt = now
	product.UpdatedAt = now

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return models.Product{}, err
	}
	defer tx.Rollback(ctx)
	if err := ensureProductSlugAvailable(ctx, tx, product.ID, product.Slug); err != nil {
		return models.Product{}, err
	}
	if err := ensureFeaturedSlot(ctx, tx, product.ID, product.IsFeatured); err != nil {
		return models.Product{}, err
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO products (
			id, slug, title, short_description, description, cover_image_id, category, usage_label,
			use_cases, techniques, materials, colors, diameter_cm, is_customizable, customizable_color,
			customizable_size, customizable_material, price_label, base_price_rial, price_currency, availability,
			preparation_time, preparation_days, is_featured, featured_order, seo_title, seo_description,
			status, sort_order, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)`,
		product.ID, product.Slug, product.Title, product.ShortDescription, product.Description,
		product.CoverImageID, product.Category, product.UsageLabel, mustJSON(product.UseCases),
		mustJSON(product.Techniques), mustJSON(product.Materials), mustJSON(product.Colors), product.DiameterCM,
		product.IsCustomizable, product.CustomizableColor, product.CustomizableSize, product.CustomizableMaterial,
		product.PriceLabel, product.BasePriceRial,
		product.PriceCurrency, product.Availability, product.PreparationTime, product.PreparationDays,
		product.IsFeatured, product.FeaturedOrder, product.SEOTitle, product.SEODescription,
		product.Status, product.SortOrder, product.CreatedAt, product.UpdatedAt,
	)
	if err != nil {
		return models.Product{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Product{}, err
	}
	return product, nil
}

func (r *ProductRepository) UpdateProduct(ctx context.Context, id string, product models.Product) (models.Product, error) {
	normalizeProduct(&product)
	product.ID = strings.TrimSpace(id)
	if err := ValidateProduct(product); err != nil {
		return models.Product{}, err
	}
	product.UpdatedAt = time.Now().UTC()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return models.Product{}, err
	}
	defer tx.Rollback(ctx)
	var currentSlug string
	if err := tx.QueryRow(ctx, `SELECT slug FROM products WHERE id = $1 FOR UPDATE`, product.ID).Scan(&currentSlug); errors.Is(err, pgx.ErrNoRows) {
		return models.Product{}, ErrNotFound
	} else if err != nil {
		return models.Product{}, err
	}
	if err := ensureProductSlugAvailable(ctx, tx, product.ID, product.Slug); err != nil {
		return models.Product{}, err
	}
	if currentSlug != product.Slug {
		if _, err := tx.Exec(ctx, `DELETE FROM product_slug_history WHERE product_id = $1 AND slug = $2`, product.ID, product.Slug); err != nil {
			return models.Product{}, err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO product_slug_history (product_id, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`, product.ID, currentSlug); err != nil {
			return models.Product{}, err
		}
	}
	if err := ensureFeaturedSlot(ctx, tx, product.ID, product.IsFeatured); err != nil {
		return models.Product{}, err
	}

	row := tx.QueryRow(
		ctx,
		`UPDATE products SET
			slug=$2, title=$3, short_description=$4, description=$5, cover_image_id=$6,
			category=$7, usage_label=$8, use_cases=$9, techniques=$10, materials=$11, colors=$12,
			diameter_cm=$13, is_customizable=$14, customizable_color=$15, customizable_size=$16,
			customizable_material=$17, price_label=$18, base_price_rial=$19, price_currency=$20,
			availability=$21, preparation_time=$22, preparation_days=$23, is_featured=$24,
			featured_order=$25, seo_title=$26, seo_description=$27, status=$28, sort_order=$29, updated_at=$30
		 WHERE id=$1
		 RETURNING `+productColumns,
		product.ID, product.Slug, product.Title, product.ShortDescription, product.Description,
		product.CoverImageID, product.Category, product.UsageLabel, mustJSON(product.UseCases),
		mustJSON(product.Techniques), mustJSON(product.Materials), mustJSON(product.Colors), product.DiameterCM,
		product.IsCustomizable, product.CustomizableColor, product.CustomizableSize, product.CustomizableMaterial,
		product.PriceLabel, product.BasePriceRial,
		product.PriceCurrency, product.Availability, product.PreparationTime, product.PreparationDays,
		product.IsFeatured, product.FeaturedOrder, product.SEOTitle, product.SEODescription,
		product.Status, product.SortOrder, product.UpdatedAt,
	)
	updated, err := scanProduct(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Product{}, ErrNotFound
	}
	if err != nil {
		return models.Product{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Product{}, err
	}
	return updated, nil
}

func (r *ProductRepository) UpdateStatus(ctx context.Context, id, status string) (models.Product, error) {
	product, err := r.GetProduct(ctx, id, true)
	if err != nil {
		return models.Product{}, err
	}
	product.Status = strings.TrimSpace(status)
	if product.Status != ProductStatusActive {
		product.IsFeatured = false
	}
	return r.UpdateProduct(ctx, id, product)
}

func ValidateProduct(product models.Product) error {
	if product.Slug == "" {
		return errors.New("آدرس محصول الزامی است")
	}
	if product.Title == "" {
		return errors.New("نام محصول الزامی است")
	}
	if product.BasePriceRial < 0 {
		return errors.New("قیمت پایه نمی‌تواند منفی باشد")
	}
	if product.PreparationDays < 0 {
		return errors.New("زمان آماده‌سازی نمی‌تواند منفی باشد")
	}
	if product.DiameterCM != nil && *product.DiameterCM <= 0 {
		return errors.New("قطر محصول باید بیشتر از صفر باشد")
	}
	if err := validateControlledValues(product.UseCases, validProductUseCases, "کاربرد"); err != nil {
		return err
	}
	if err := validateControlledValues(product.Techniques, validProductTechniques, "تکنیک"); err != nil {
		return err
	}
	if err := validateControlledValues(product.Materials, validProductMaterials, "جنس"); err != nil {
		return err
	}
	if err := validateControlledValues(product.Colors, validProductColors, "رنگ"); err != nil {
		return err
	}
	if product.PriceCurrency != "IRR" {
		return errors.New("واحد قیمت محصول باید ریال باشد")
	}
	switch product.Availability {
	case ProductAvailabilityInStock, ProductAvailabilityMadeToOrder, ProductAvailabilityOutOfStock:
	default:
		return errors.New("وضعیت موجودی محصول معتبر نیست")
	}
	switch product.Status {
	case ProductStatusActive, ProductStatusDraft, ProductStatusArchived:
	default:
		return errors.New("وضعیت انتشار محصول معتبر نیست")
	}
	if utf8.RuneCountInString(product.SEOTitle) > 70 {
		return errors.New("عنوان SEO نباید بیشتر از ۷۰ کاراکتر باشد")
	}
	if utf8.RuneCountInString(product.SEODescription) > 180 {
		return errors.New("توضیح SEO نباید بیشتر از ۱۸۰ کاراکتر باشد")
	}
	if product.Status == ProductStatusActive {
		if product.CoverImageID == "" || product.Description == "" || product.UsageLabel == "" {
			return errors.New("برای انتشار محصول، تصویر، توضیحات و کاربرد الزامی است")
		}
		if product.BasePriceRial <= 0 {
			return errors.New("برای انتشار محصول، قیمت پایه واقعی را وارد کنید")
		}
	}
	if product.IsFeatured && product.Status != ProductStatusActive {
		return errors.New("فقط محصول منتشرشده می‌تواند منتخب باشد")
	}
	return nil
}

func ensureFeaturedSlot(ctx context.Context, tx pgx.Tx, productID string, featured bool) error {
	if !featured {
		return nil
	}
	if _, err := tx.Exec(ctx, `LOCK TABLE products IN SHARE ROW EXCLUSIVE MODE`); err != nil {
		return err
	}
	var count int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM products WHERE is_featured = TRUE AND id <> $1`, productID).Scan(&count); err != nil {
		return err
	}
	if count >= 3 {
		return ErrFeaturedLimit
	}
	return nil
}

func ensureProductSlugAvailable(ctx context.Context, tx pgx.Tx, productID, slug string) error {
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (
		SELECT 1 FROM products WHERE slug = $1 AND id <> $2
		UNION ALL
		SELECT 1 FROM product_slug_history WHERE slug = $1 AND product_id <> $2
	)`, slug, productID).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return ErrProductSlugTaken
	}
	return nil
}

func scanProduct(scanner interface{ Scan(dest ...any) error }) (models.Product, error) {
	var product models.Product
	var materialsJSON []byte
	var colorsJSON []byte
	var useCasesJSON []byte
	var techniquesJSON []byte

	err := scanner.Scan(
		&product.ID, &product.Slug, &product.Title, &product.ShortDescription, &product.Description,
		&product.CoverImageID, &product.Category, &product.UsageLabel, &useCasesJSON, &techniquesJSON,
		&materialsJSON, &colorsJSON, &product.DiameterCM, &product.IsCustomizable, &product.CustomizableColor,
		&product.CustomizableSize, &product.CustomizableMaterial, &product.PriceLabel, &product.BasePriceRial, &product.PriceCurrency,
		&product.Availability, &product.PreparationTime, &product.PreparationDays, &product.IsFeatured,
		&product.FeaturedOrder, &product.SEOTitle, &product.SEODescription, &product.Status,
		&product.SortOrder, &product.CreatedAt, &product.UpdatedAt,
	)
	if err != nil {
		return models.Product{}, err
	}
	if err := json.Unmarshal(materialsJSON, &product.Materials); err != nil {
		return models.Product{}, err
	}
	if err := json.Unmarshal(useCasesJSON, &product.UseCases); err != nil {
		return models.Product{}, err
	}
	if err := json.Unmarshal(techniquesJSON, &product.Techniques); err != nil {
		return models.Product{}, err
	}
	if err := json.Unmarshal(colorsJSON, &product.Colors); err != nil {
		return models.Product{}, err
	}
	return product, nil
}

func normalizeProduct(product *models.Product) {
	product.ID = strings.TrimSpace(product.ID)
	product.Slug = strings.Trim(strings.TrimSpace(product.Slug), "/")
	product.Title = strings.TrimSpace(product.Title)
	product.ShortDescription = strings.TrimSpace(product.ShortDescription)
	product.Description = strings.TrimSpace(product.Description)
	product.CoverImageID = strings.TrimSpace(product.CoverImageID)
	product.Category = strings.TrimSpace(product.Category)
	product.UsageLabel = strings.TrimSpace(product.UsageLabel)
	product.PriceLabel = strings.TrimSpace(product.PriceLabel)
	product.PriceCurrency = strings.ToUpper(strings.TrimSpace(product.PriceCurrency))
	product.Availability = strings.TrimSpace(product.Availability)
	product.PreparationTime = strings.TrimSpace(product.PreparationTime)
	product.SEOTitle = strings.TrimSpace(product.SEOTitle)
	product.SEODescription = strings.TrimSpace(product.SEODescription)
	product.Status = strings.TrimSpace(product.Status)

	if product.Slug == "" {
		product.Slug = product.ID
	}
	if product.ShortDescription == "" {
		product.ShortDescription = product.Description
	}
	if product.Description == "" {
		product.Description = product.ShortDescription
	}
	if product.Category == "" {
		product.Category = "گل پارچه‌ای"
	}
	if product.PriceCurrency == "" {
		product.PriceCurrency = "IRR"
	}
	if product.Availability == "" {
		product.Availability = ProductAvailabilityInStock
	}
	if product.Status == "" {
		product.Status = ProductStatusDraft
	}
	if product.Materials == nil {
		product.Materials = []string{}
	}
	if product.Colors == nil {
		product.Colors = []string{}
	}
	if product.UseCases == nil {
		product.UseCases = []string{}
	}
	if product.Techniques == nil {
		product.Techniques = []string{}
	}
	product.UseCases = uniqueStrings(product.UseCases)
	product.Techniques = uniqueStrings(product.Techniques)
	product.Materials = uniqueStrings(product.Materials)
	product.Colors = uniqueStrings(product.Colors)
	if product.CustomizableColor || product.CustomizableSize || product.CustomizableMaterial {
		product.IsCustomizable = true
	}
}

func validateControlledValues(values []string, allowed map[string]struct{}, label string) error {
	for _, value := range values {
		if _, ok := allowed[value]; !ok {
			return fmt.Errorf("%s محصول معتبر نیست", label)
		}
	}
	return nil
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
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

func isUniqueViolationCode(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}
