package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"melody-server/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AddressRepository struct {
	pool *pgxpool.Pool
}

func NewAddressRepository(pool *pgxpool.Pool) *AddressRepository {
	return &AddressRepository{pool: pool}
}

func (r *AddressRepository) ListByUser(ctx context.Context, userID string) ([]models.Address, error) {
	rows, err := r.pool.Query(
		ctx,
		`SELECT id, user_id, title, full_address, receiver_name, receiver_phone, is_default,
			lat, lng, map_provider, place_id, postal_code, city, province, created_at, updated_at
		 FROM user_addresses
		 WHERE user_id = $1
		 ORDER BY is_default DESC, updated_at DESC, created_at DESC`,
		strings.TrimSpace(userID),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	addresses := make([]models.Address, 0)
	for rows.Next() {
		address, err := scanAddress(rows)
		if err != nil {
			return nil, err
		}
		addresses = append(addresses, address)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return addresses, nil
}

func (r *AddressRepository) GetByUser(ctx context.Context, userID string, addressID string) (models.Address, error) {
	row := r.pool.QueryRow(
		ctx,
		`SELECT id, user_id, title, full_address, receiver_name, receiver_phone, is_default,
			lat, lng, map_provider, place_id, postal_code, city, province, created_at, updated_at
		 FROM user_addresses
		 WHERE user_id = $1 AND id = $2
		 LIMIT 1`,
		strings.TrimSpace(userID),
		strings.TrimSpace(addressID),
	)
	address, err := scanAddress(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Address{}, ErrNotFound
	}
	return address, err
}

func (r *AddressRepository) Create(ctx context.Context, address models.Address) (models.Address, error) {
	normalizeAddress(&address)
	if address.ID == "" {
		address.ID = generateID()
	}
	now := time.Now().UTC()
	address.CreatedAt = now
	address.UpdatedAt = now

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return models.Address{}, err
	}
	defer tx.Rollback(ctx)

	if !address.IsDefault {
		var count int
		if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM user_addresses WHERE user_id = $1`, address.UserID).Scan(&count); err != nil {
			return models.Address{}, err
		}
		address.IsDefault = count == 0
	}
	if address.IsDefault {
		if _, err := tx.Exec(ctx, `UPDATE user_addresses SET is_default = FALSE, updated_at = $2 WHERE user_id = $1`, address.UserID, now); err != nil {
			return models.Address{}, err
		}
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO user_addresses (
			id, user_id, title, full_address, receiver_name, receiver_phone, is_default,
			lat, lng, map_provider, place_id, postal_code, city, province, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
		address.ID,
		address.UserID,
		address.Title,
		address.FullAddress,
		address.ReceiverName,
		address.ReceiverPhone,
		address.IsDefault,
		address.Lat,
		address.Lng,
		address.MapProvider,
		address.PlaceID,
		address.PostalCode,
		address.City,
		address.Province,
		address.CreatedAt,
		address.UpdatedAt,
	)
	if err != nil {
		return models.Address{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Address{}, err
	}
	return address, nil
}

func (r *AddressRepository) Update(ctx context.Context, userID string, addressID string, address models.Address) (models.Address, error) {
	normalizeAddress(&address)
	address.ID = strings.TrimSpace(addressID)
	address.UserID = strings.TrimSpace(userID)
	address.UpdatedAt = time.Now().UTC()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return models.Address{}, err
	}
	defer tx.Rollback(ctx)

	if address.IsDefault {
		if _, err := tx.Exec(ctx, `UPDATE user_addresses SET is_default = FALSE, updated_at = $2 WHERE user_id = $1`, address.UserID, address.UpdatedAt); err != nil {
			return models.Address{}, err
		}
	}

	row := tx.QueryRow(
		ctx,
		`UPDATE user_addresses SET
			title = $3,
			full_address = $4,
			receiver_name = $5,
			receiver_phone = $6,
			is_default = $7,
			lat = $8,
			lng = $9,
			map_provider = $10,
			place_id = $11,
			postal_code = $12,
			city = $13,
			province = $14,
			updated_at = $15
		 WHERE user_id = $1 AND id = $2
		 RETURNING id, user_id, title, full_address, receiver_name, receiver_phone, is_default,
			lat, lng, map_provider, place_id, postal_code, city, province, created_at, updated_at`,
		address.UserID,
		address.ID,
		address.Title,
		address.FullAddress,
		address.ReceiverName,
		address.ReceiverPhone,
		address.IsDefault,
		address.Lat,
		address.Lng,
		address.MapProvider,
		address.PlaceID,
		address.PostalCode,
		address.City,
		address.Province,
		address.UpdatedAt,
	)
	updated, err := scanAddress(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Address{}, ErrNotFound
	}
	if err != nil {
		return models.Address{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Address{}, err
	}
	return updated, nil
}

func (r *AddressRepository) Delete(ctx context.Context, userID string, addressID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var wasDefault bool
	err = tx.QueryRow(ctx, `SELECT is_default FROM user_addresses WHERE user_id = $1 AND id = $2`, strings.TrimSpace(userID), strings.TrimSpace(addressID)).Scan(&wasDefault)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}

	result, err := tx.Exec(ctx, `DELETE FROM user_addresses WHERE user_id = $1 AND id = $2`, strings.TrimSpace(userID), strings.TrimSpace(addressID))
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	if wasDefault {
		if _, err := tx.Exec(
			ctx,
			`UPDATE user_addresses
			 SET is_default = TRUE, updated_at = $2
			 WHERE id = (
				SELECT id FROM user_addresses WHERE user_id = $1 ORDER BY updated_at DESC, created_at DESC LIMIT 1
			 )`,
			strings.TrimSpace(userID),
			time.Now().UTC(),
		); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *AddressRepository) SetDefault(ctx context.Context, userID string, addressID string) (models.Address, error) {
	now := time.Now().UTC()
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return models.Address{}, err
	}
	defer tx.Rollback(ctx)

	result, err := tx.Exec(ctx, `UPDATE user_addresses SET is_default = FALSE, updated_at = $2 WHERE user_id = $1`, strings.TrimSpace(userID), now)
	if err != nil {
		return models.Address{}, err
	}
	_ = result

	row := tx.QueryRow(
		ctx,
		`UPDATE user_addresses SET is_default = TRUE, updated_at = $3
		 WHERE user_id = $1 AND id = $2
		 RETURNING id, user_id, title, full_address, receiver_name, receiver_phone, is_default,
			lat, lng, map_provider, place_id, postal_code, city, province, created_at, updated_at`,
		strings.TrimSpace(userID),
		strings.TrimSpace(addressID),
		now,
	)
	address, err := scanAddress(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Address{}, ErrNotFound
	}
	if err != nil {
		return models.Address{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Address{}, err
	}
	return address, nil
}

func scanAddress(scanner interface {
	Scan(dest ...any) error
}) (models.Address, error) {
	var address models.Address
	err := scanner.Scan(
		&address.ID,
		&address.UserID,
		&address.Title,
		&address.FullAddress,
		&address.ReceiverName,
		&address.ReceiverPhone,
		&address.IsDefault,
		&address.Lat,
		&address.Lng,
		&address.MapProvider,
		&address.PlaceID,
		&address.PostalCode,
		&address.City,
		&address.Province,
		&address.CreatedAt,
		&address.UpdatedAt,
	)
	return address, err
}

func normalizeAddress(address *models.Address) {
	address.ID = strings.TrimSpace(address.ID)
	address.UserID = strings.TrimSpace(address.UserID)
	address.Title = strings.TrimSpace(address.Title)
	address.FullAddress = strings.TrimSpace(address.FullAddress)
	address.ReceiverName = strings.TrimSpace(address.ReceiverName)
	address.ReceiverPhone = strings.TrimSpace(address.ReceiverPhone)
	address.MapProvider = strings.TrimSpace(address.MapProvider)
	address.PlaceID = strings.TrimSpace(address.PlaceID)
	address.PostalCode = strings.TrimSpace(address.PostalCode)
	address.City = strings.TrimSpace(address.City)
	address.Province = strings.TrimSpace(address.Province)
}

func AddressSnapshot(address models.Address) models.DeliveryAddressSnapshot {
	return models.DeliveryAddressSnapshot{
		Title:         address.Title,
		FullAddress:   address.FullAddress,
		ReceiverName:  address.ReceiverName,
		ReceiverPhone: address.ReceiverPhone,
	}
}
