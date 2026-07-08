package repository

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"melody-server/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var validOrderStatuses = map[string]struct{}{
	"draft":          {},
	"pending_review": {},
	"need_more_info": {},
	"confirmed":      {},
	"in_progress":    {},
	"ready":          {},
	"delivered":      {},
	"cancelled":      {},
}

type OrderRepository struct {
	pool *pgxpool.Pool
}

func NewOrderRepository(pool *pgxpool.Pool) *OrderRepository {
	return &OrderRepository{pool: pool}
}

func IsValidOrderStatus(status string) bool {
	_, ok := validOrderStatuses[strings.TrimSpace(status)]
	return ok
}

func (r *OrderRepository) CreateOrder(ctx context.Context, order models.Order) (models.Order, error) {
	normalizeOrder(&order)
	if order.ID == "" {
		order.ID = generateID()
	}
	now := time.Now().UTC()
	order.CreatedAt = now
	order.UpdatedAt = now
	if order.Status == "" {
		order.Status = "draft"
	}
	if len(order.StatusHistory) == 0 {
		order.StatusHistory = []models.OrderStatusEntry{{Status: order.Status, CreatedAt: now}}
	}
	if order.Status != "draft" && order.SubmittedAt == nil {
		order.SubmittedAt = &now
	}

	_, err := r.pool.Exec(
		ctx,
		`INSERT INTO orders (
			id, user_id, type, product_id, product_snapshot, status, usage, usage_other_text,
			preferred_color, style_note, quantity, needed_by, customer_note, delivery_address_id,
			delivery_address_snapshot, admin_note, status_history, created_at, updated_at, submitted_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
		order.ID,
		order.UserID,
		order.Type,
		nullableString(order.ProductID),
		mustJSON(order.ProductSnapshot),
		order.Status,
		order.Usage,
		order.UsageOtherText,
		order.PreferredColor,
		order.StyleNote,
		order.Quantity,
		order.NeededBy,
		order.CustomerNote,
		nullableString(order.DeliveryAddressID),
		mustJSON(order.DeliveryAddressSnapshot),
		order.AdminNote,
		mustJSON(order.StatusHistory),
		order.CreatedAt,
		order.UpdatedAt,
		order.SubmittedAt,
	)
	return order, err
}

func (r *OrderRepository) ListOrdersByUser(ctx context.Context, userID string) ([]models.Order, error) {
	rows, err := r.pool.Query(ctx, orderSelectSQL()+` WHERE o.user_id = $1 ORDER BY o.created_at DESC`, strings.TrimSpace(userID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanOrders(rows)
}

func (r *OrderRepository) GetOrderByUser(ctx context.Context, userID string, orderID string) (models.Order, error) {
	row := r.pool.QueryRow(ctx, orderSelectSQL()+` WHERE o.user_id = $1 AND o.id = $2 LIMIT 1`, strings.TrimSpace(userID), strings.TrimSpace(orderID))
	order, err := scanOrder(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Order{}, ErrNotFound
	}
	return order, err
}

func (r *OrderRepository) ListAdminOrders(ctx context.Context) ([]models.Order, error) {
	rows, err := r.pool.Query(ctx, orderSelectSQL()+` WHERE o.status <> 'draft' ORDER BY o.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanOrders(rows)
}

func (r *OrderRepository) GetAdminOrder(ctx context.Context, orderID string) (models.Order, error) {
	row := r.pool.QueryRow(ctx, orderSelectSQL()+` WHERE o.id = $1 LIMIT 1`, strings.TrimSpace(orderID))
	order, err := scanOrder(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Order{}, ErrNotFound
	}
	return order, err
}

func (r *OrderRepository) UpdateStatus(ctx context.Context, orderID string, status string, adminNote string) (models.Order, error) {
	status = strings.TrimSpace(status)
	adminNote = strings.TrimSpace(adminNote)
	if !IsValidOrderStatus(status) {
		return models.Order{}, errors.New("invalid order status")
	}

	current, err := r.GetAdminOrder(ctx, orderID)
	if err != nil {
		return models.Order{}, err
	}

	now := time.Now().UTC()
	history := append([]models.OrderStatusEntry{}, current.StatusHistory...)
	if current.Status != status || adminNote != "" {
		history = append(history, models.OrderStatusEntry{
			Status:    status,
			Note:      adminNote,
			CreatedAt: now,
		})
	}

	row := r.pool.QueryRow(
		ctx,
		`UPDATE orders SET status = $2, admin_note = $3, status_history = $4, updated_at = $5
		 WHERE id = $1
		 RETURNING id, user_id, type, product_id, product_snapshot, status, usage, usage_other_text,
			preferred_color, style_note, quantity, needed_by, customer_note, delivery_address_id,
			delivery_address_snapshot, admin_note, status_history, created_at, updated_at, submitted_at`,
		strings.TrimSpace(orderID),
		status,
		adminNote,
		mustJSON(history),
		now,
	)
	updated, err := scanOrderWithoutUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Order{}, ErrNotFound
	}
	if err != nil {
		return models.Order{}, err
	}
	updated.UserName = current.UserName
	updated.UserPhone = current.UserPhone
	return updated, nil
}

func (r *OrderRepository) UpdateDraft(ctx context.Context, userID string, orderID string, next models.Order) (models.Order, error) {
	normalizeOrder(&next)
	current, err := r.GetOrderByUser(ctx, userID, orderID)
	if err != nil {
		return models.Order{}, err
	}
	if current.Status != "draft" {
		return models.Order{}, errors.New("order is not a draft")
	}

	now := time.Now().UTC()
	row := r.pool.QueryRow(
		ctx,
		`UPDATE orders SET
			type = $3,
			product_id = $4,
			product_snapshot = $5,
			usage = $6,
			usage_other_text = $7,
			preferred_color = $8,
			style_note = $9,
			quantity = $10,
			needed_by = $11,
			customer_note = $12,
			delivery_address_id = $13,
			delivery_address_snapshot = $14,
			updated_at = $15
		 WHERE user_id = $1 AND id = $2 AND status = 'draft'
		 RETURNING id, user_id, type, product_id, product_snapshot, status, usage, usage_other_text,
			preferred_color, style_note, quantity, needed_by, customer_note, delivery_address_id,
			delivery_address_snapshot, admin_note, status_history, created_at, updated_at, submitted_at`,
		strings.TrimSpace(userID),
		strings.TrimSpace(orderID),
		next.Type,
		nullableString(next.ProductID),
		mustJSON(next.ProductSnapshot),
		next.Usage,
		next.UsageOtherText,
		next.PreferredColor,
		next.StyleNote,
		next.Quantity,
		next.NeededBy,
		next.CustomerNote,
		nullableString(next.DeliveryAddressID),
		mustJSON(next.DeliveryAddressSnapshot),
		now,
	)
	updated, err := scanOrderWithoutUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Order{}, ErrNotFound
	}
	if err != nil {
		return models.Order{}, err
	}
	updated.UserName = current.UserName
	updated.UserPhone = current.UserPhone
	return updated, nil
}

func (r *OrderRepository) SubmitDraft(ctx context.Context, userID string, orderID string) (models.Order, error) {
	current, err := r.GetOrderByUser(ctx, userID, orderID)
	if err != nil {
		return models.Order{}, err
	}
	if current.Status != "draft" {
		return models.Order{}, errors.New("order is not a draft")
	}

	now := time.Now().UTC()
	history := append([]models.OrderStatusEntry{}, current.StatusHistory...)
	history = append(history, models.OrderStatusEntry{Status: "pending_review", CreatedAt: now})

	row := r.pool.QueryRow(
		ctx,
		`UPDATE orders SET status = 'pending_review', status_history = $3, updated_at = $4, submitted_at = $4
		 WHERE user_id = $1 AND id = $2 AND status = 'draft'
		 RETURNING id, user_id, type, product_id, product_snapshot, status, usage, usage_other_text,
			preferred_color, style_note, quantity, needed_by, customer_note, delivery_address_id,
			delivery_address_snapshot, admin_note, status_history, created_at, updated_at, submitted_at`,
		strings.TrimSpace(userID),
		strings.TrimSpace(orderID),
		mustJSON(history),
		now,
	)
	updated, err := scanOrderWithoutUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Order{}, ErrNotFound
	}
	if err != nil {
		return models.Order{}, err
	}
	updated.UserName = current.UserName
	updated.UserPhone = current.UserPhone
	return updated, nil
}

func (r *OrderRepository) DeleteDraft(ctx context.Context, userID string, orderID string) error {
	result, err := r.pool.Exec(ctx, `DELETE FROM orders WHERE user_id = $1 AND id = $2 AND status = 'draft'`, strings.TrimSpace(userID), strings.TrimSpace(orderID))
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *OrderRepository) ListReferenceImages(ctx context.Context, orderID string) ([]models.OrderReferenceImage, error) {
	rows, err := r.pool.Query(
		ctx,
		`SELECT id, order_id, filename, content_type, sort_order, created_at
		 FROM order_reference_images
		 WHERE order_id = $1
		 ORDER BY sort_order ASC, created_at ASC`,
		strings.TrimSpace(orderID),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	images := make([]models.OrderReferenceImage, 0)
	for rows.Next() {
		var image models.OrderReferenceImage
		if err := rows.Scan(&image.ID, &image.OrderID, &image.Filename, &image.ContentType, &image.SortOrder, &image.CreatedAt); err != nil {
			return nil, err
		}
		images = append(images, image)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return images, nil
}

func (r *OrderRepository) CreateReferenceImage(ctx context.Context, image models.OrderReferenceImage) (models.OrderReferenceImage, error) {
	if image.ID == "" {
		image.ID = generateID()
	}
	if image.CreatedAt.IsZero() {
		image.CreatedAt = time.Now().UTC()
	}
	_, err := r.pool.Exec(
		ctx,
		`INSERT INTO order_reference_images (id, order_id, filename, content_type, data, sort_order, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		image.ID,
		image.OrderID,
		image.Filename,
		image.ContentType,
		image.Data,
		image.SortOrder,
		image.CreatedAt,
	)
	return image, err
}

func (r *OrderRepository) GetReferenceImageContentByUser(ctx context.Context, userID string, orderID string, imageID string) (models.OrderReferenceImage, error) {
	row := r.pool.QueryRow(
		ctx,
		`SELECT i.id, i.order_id, i.filename, i.content_type, i.data, i.sort_order, i.created_at
		 FROM order_reference_images i
		 JOIN orders o ON o.id = i.order_id
		 WHERE o.user_id = $1 AND i.order_id = $2 AND i.id = $3
		 LIMIT 1`,
		strings.TrimSpace(userID),
		strings.TrimSpace(orderID),
		strings.TrimSpace(imageID),
	)
	image, err := scanReferenceImageContent(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.OrderReferenceImage{}, ErrNotFound
	}
	return image, err
}

func (r *OrderRepository) DeleteReferenceImageByUser(ctx context.Context, userID string, orderID string, imageID string) error {
	result, err := r.pool.Exec(
		ctx,
		`DELETE FROM order_reference_images i
		 USING orders o
		 WHERE o.id = i.order_id AND o.user_id = $1 AND i.order_id = $2 AND i.id = $3`,
		strings.TrimSpace(userID),
		strings.TrimSpace(orderID),
		strings.TrimSpace(imageID),
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func orderSelectSQL() string {
	return `SELECT o.id, o.user_id, COALESCE(u.full_name, ''), COALESCE(u.phone, ''),
		o.type, o.product_id, o.product_snapshot, o.status, o.usage, o.usage_other_text,
		o.preferred_color, o.style_note, o.quantity, o.needed_by, o.customer_note, o.delivery_address_id,
		o.delivery_address_snapshot, o.admin_note, o.status_history, o.created_at, o.updated_at, o.submitted_at
		FROM orders o
		LEFT JOIN users u ON u.id = o.user_id`
}

func scanOrders(rows pgx.Rows) ([]models.Order, error) {
	orders := make([]models.Order, 0)
	for rows.Next() {
		order, err := scanOrder(rows)
		if err != nil {
			return nil, err
		}
		orders = append(orders, order)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return orders, nil
}

func scanOrder(scanner interface {
	Scan(dest ...any) error
}) (models.Order, error) {
	var order models.Order
	var productID *string
	var deliveryAddressID *string
	var snapshotJSON []byte
	var addressSnapshotJSON []byte
	var historyJSON []byte

	err := scanner.Scan(
		&order.ID,
		&order.UserID,
		&order.UserName,
		&order.UserPhone,
		&order.Type,
		&productID,
		&snapshotJSON,
		&order.Status,
		&order.Usage,
		&order.UsageOtherText,
		&order.PreferredColor,
		&order.StyleNote,
		&order.Quantity,
		&order.NeededBy,
		&order.CustomerNote,
		&deliveryAddressID,
		&addressSnapshotJSON,
		&order.AdminNote,
		&historyJSON,
		&order.CreatedAt,
		&order.UpdatedAt,
		&order.SubmittedAt,
	)
	if err != nil {
		return models.Order{}, err
	}
	if productID != nil {
		order.ProductID = *productID
	}
	if deliveryAddressID != nil {
		order.DeliveryAddressID = *deliveryAddressID
	}
	if err := json.Unmarshal(snapshotJSON, &order.ProductSnapshot); err != nil {
		return models.Order{}, err
	}
	if err := json.Unmarshal(addressSnapshotJSON, &order.DeliveryAddressSnapshot); err != nil {
		return models.Order{}, err
	}
	if err := json.Unmarshal(historyJSON, &order.StatusHistory); err != nil {
		return models.Order{}, err
	}
	return order, nil
}

func scanOrderWithoutUser(scanner interface {
	Scan(dest ...any) error
}) (models.Order, error) {
	var order models.Order
	var productID *string
	var deliveryAddressID *string
	var snapshotJSON []byte
	var addressSnapshotJSON []byte
	var historyJSON []byte

	err := scanner.Scan(
		&order.ID,
		&order.UserID,
		&order.Type,
		&productID,
		&snapshotJSON,
		&order.Status,
		&order.Usage,
		&order.UsageOtherText,
		&order.PreferredColor,
		&order.StyleNote,
		&order.Quantity,
		&order.NeededBy,
		&order.CustomerNote,
		&deliveryAddressID,
		&addressSnapshotJSON,
		&order.AdminNote,
		&historyJSON,
		&order.CreatedAt,
		&order.UpdatedAt,
		&order.SubmittedAt,
	)
	if err != nil {
		return models.Order{}, err
	}
	if productID != nil {
		order.ProductID = *productID
	}
	if deliveryAddressID != nil {
		order.DeliveryAddressID = *deliveryAddressID
	}
	if err := json.Unmarshal(snapshotJSON, &order.ProductSnapshot); err != nil {
		return models.Order{}, err
	}
	if err := json.Unmarshal(addressSnapshotJSON, &order.DeliveryAddressSnapshot); err != nil {
		return models.Order{}, err
	}
	if err := json.Unmarshal(historyJSON, &order.StatusHistory); err != nil {
		return models.Order{}, err
	}
	return order, nil
}

func normalizeOrder(order *models.Order) {
	order.ID = strings.TrimSpace(order.ID)
	order.UserID = strings.TrimSpace(order.UserID)
	order.Type = strings.TrimSpace(order.Type)
	order.ProductID = strings.TrimSpace(order.ProductID)
	order.Status = strings.TrimSpace(order.Status)
	order.Usage = strings.TrimSpace(order.Usage)
	order.UsageOtherText = strings.TrimSpace(order.UsageOtherText)
	order.PreferredColor = strings.TrimSpace(order.PreferredColor)
	order.StyleNote = strings.TrimSpace(order.StyleNote)
	order.NeededBy = strings.TrimSpace(order.NeededBy)
	order.CustomerNote = strings.TrimSpace(order.CustomerNote)
	order.DeliveryAddressID = strings.TrimSpace(order.DeliveryAddressID)
	order.AdminNote = strings.TrimSpace(order.AdminNote)
	if order.Type == "" {
		if order.ProductID == "" {
			order.Type = "custom"
		} else {
			order.Type = "product"
		}
	}
	if order.Type != "product" && order.Type != "custom" {
		order.Type = "product"
	}
	if order.Quantity <= 0 {
		order.Quantity = 1
	}
	if !IsValidOrderStatus(order.Status) {
		order.Status = "draft"
	}
}

func scanReferenceImageContent(scanner interface {
	Scan(dest ...any) error
}) (models.OrderReferenceImage, error) {
	var image models.OrderReferenceImage
	err := scanner.Scan(
		&image.ID,
		&image.OrderID,
		&image.Filename,
		&image.ContentType,
		&image.Data,
		&image.SortOrder,
		&image.CreatedAt,
	)
	return image, err
}
