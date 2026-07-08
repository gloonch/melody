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

type UserRepository struct {
	pool *pgxpool.Pool
}

type UserProfileUpdate struct {
	Email     string
	FullName  string
	FirstName string
	LastName  string
	Phone     string
	BirthDate string
	Instagram string
	Website   string
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) CreateUser(ctx context.Context, user models.User) (models.User, error) {
	normalizeUser(&user)
	if user.ID == "" {
		user.ID = generateID()
	}
	if user.Role == "" {
		user.Role = "user"
	}
	now := time.Now().UTC()
	user.CreatedAt = now
	user.UpdatedAt = now
	user.IsActive = true

	_, err := r.pool.Exec(
		ctx,
		`INSERT INTO users (
			id, email, password_hash, full_name, first_name, last_name, phone,
			birth_date, instagram, website, role, is_active, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
		user.ID,
		nullableString(user.Email),
		user.PasswordHash,
		user.FullName,
		user.FirstName,
		user.LastName,
		user.Phone,
		user.BirthDate,
		user.Instagram,
		user.Website,
		user.Role,
		user.IsActive,
		user.CreatedAt,
		user.UpdatedAt,
	)
	return user, err
}

func (r *UserRepository) GetByPhone(ctx context.Context, phone string) (models.User, error) {
	row := r.pool.QueryRow(ctx, userSelectSQL()+` WHERE phone = $1 LIMIT 1`, strings.TrimSpace(phone))
	user, err := scanUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.User{}, ErrNotFound
	}
	return user, err
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (models.User, error) {
	row := r.pool.QueryRow(ctx, userSelectSQL()+` WHERE id = $1 LIMIT 1`, strings.TrimSpace(id))
	user, err := scanUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.User{}, ErrNotFound
	}
	return user, err
}

func (r *UserRepository) UpdateProfile(ctx context.Context, id string, update UserProfileUpdate) (models.User, error) {
	update.Email = strings.TrimSpace(update.Email)
	update.FullName = strings.TrimSpace(update.FullName)
	update.FirstName = strings.TrimSpace(update.FirstName)
	update.LastName = strings.TrimSpace(update.LastName)
	update.Phone = strings.TrimSpace(update.Phone)
	update.BirthDate = strings.TrimSpace(update.BirthDate)
	update.Instagram = strings.TrimSpace(update.Instagram)
	update.Website = strings.TrimSpace(update.Website)

	row := r.pool.QueryRow(
		ctx,
		`UPDATE users SET
			email = $2,
			full_name = $3,
			first_name = $4,
			last_name = $5,
			phone = $6,
			birth_date = $7,
			instagram = $8,
			website = $9,
			updated_at = $10
		 WHERE id = $1
		 RETURNING id, email, password_hash, full_name, first_name, last_name, phone,
			birth_date, instagram, website, role, is_active, created_at, updated_at, last_login_at`,
		strings.TrimSpace(id),
		nullableString(update.Email),
		update.FullName,
		update.FirstName,
		update.LastName,
		update.Phone,
		update.BirthDate,
		update.Instagram,
		update.Website,
		time.Now().UTC(),
	)
	user, err := scanUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.User{}, ErrNotFound
	}
	return user, err
}

func (r *UserRepository) UpdatePassword(ctx context.Context, id string, passwordHash string) error {
	result, err := r.pool.Exec(
		ctx,
		`UPDATE users SET password_hash = $2, updated_at = $3 WHERE id = $1`,
		strings.TrimSpace(id),
		passwordHash,
		time.Now().UTC(),
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *UserRepository) UpdateLastLogin(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE users SET last_login_at = $2 WHERE id = $1`, strings.TrimSpace(id), time.Now().UTC())
	return err
}

func (r *UserRepository) CreateRefreshToken(ctx context.Context, token models.RefreshToken) (models.RefreshToken, error) {
	if token.ID == "" {
		token.ID = generateID()
	}
	if token.CreatedAt.IsZero() {
		token.CreatedAt = time.Now().UTC()
	}

	_, err := r.pool.Exec(
		ctx,
		`INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6)`,
		token.ID,
		token.UserID,
		token.TokenHash,
		token.ExpiresAt,
		token.RevokedAt,
		token.CreatedAt,
	)
	return token, err
}

func (r *UserRepository) GetRefreshTokenByHash(ctx context.Context, tokenHash string) (models.RefreshToken, error) {
	var token models.RefreshToken
	err := r.pool.QueryRow(
		ctx,
		`SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
		 FROM refresh_tokens
		 WHERE token_hash = $1
		 LIMIT 1`,
		tokenHash,
	).Scan(&token.ID, &token.UserID, &token.TokenHash, &token.ExpiresAt, &token.RevokedAt, &token.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.RefreshToken{}, ErrNotFound
	}
	return token, err
}

func (r *UserRepository) RevokeRefreshToken(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE refresh_tokens SET revoked_at = $2 WHERE id = $1`, strings.TrimSpace(id), time.Now().UTC())
	return err
}

func (r *UserRepository) DeleteRefreshTokensForUser(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE user_id = $1`, strings.TrimSpace(userID))
	return err
}

func userSelectSQL() string {
	return `SELECT id, email, password_hash, full_name, first_name, last_name, phone,
		birth_date, instagram, website, role, is_active, created_at, updated_at, last_login_at
		FROM users`
}

func scanUser(scanner interface {
	Scan(dest ...any) error
}) (models.User, error) {
	var user models.User
	var email *string
	var lastLoginAt *time.Time
	err := scanner.Scan(
		&user.ID,
		&email,
		&user.PasswordHash,
		&user.FullName,
		&user.FirstName,
		&user.LastName,
		&user.Phone,
		&user.BirthDate,
		&user.Instagram,
		&user.Website,
		&user.Role,
		&user.IsActive,
		&user.CreatedAt,
		&user.UpdatedAt,
		&lastLoginAt,
	)
	if err != nil {
		return models.User{}, err
	}
	if email != nil {
		user.Email = *email
	}
	user.LastLoginAt = lastLoginAt
	return user, nil
}

func normalizeUser(user *models.User) {
	user.ID = strings.TrimSpace(user.ID)
	user.Email = strings.TrimSpace(user.Email)
	user.FullName = strings.TrimSpace(user.FullName)
	user.FirstName = strings.TrimSpace(user.FirstName)
	user.LastName = strings.TrimSpace(user.LastName)
	user.Phone = strings.TrimSpace(user.Phone)
	user.BirthDate = strings.TrimSpace(user.BirthDate)
	user.Instagram = strings.TrimSpace(user.Instagram)
	user.Website = strings.TrimSpace(user.Website)
	user.Role = strings.TrimSpace(user.Role)
}

func nullableString(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}
