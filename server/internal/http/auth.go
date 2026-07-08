package httpapi

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"melody-server/internal/config"

	"github.com/gin-gonic/gin"
)

const (
	accessTokenCookieName  = "access_token"
	refreshTokenCookieName = "refresh_token"
	userIDContextKey       = "user_id"
)

type accessTokenClaims struct {
	Issuer    string `json:"iss"`
	Subject   string `json:"sub"`
	Audience  string `json:"aud"`
	ExpiresAt int64  `json:"exp"`
	IssuedAt  int64  `json:"iat"`
}

type accessTokenHeader struct {
	Algorithm string `json:"alg"`
	Type      string `json:"typ"`
}

func createAccessToken(auth config.AuthConfig, userID string, role string) (string, error) {
	now := time.Now().UTC()
	claims := accessTokenClaims{
		Issuer:    auth.Issuer,
		Subject:   userID,
		Audience:  role,
		ExpiresAt: now.Add(time.Duration(auth.AccessTokenMinutes) * time.Minute).Unix(),
		IssuedAt:  now.Unix(),
	}
	header := accessTokenHeader{Algorithm: "HS256", Type: "JWT"}

	encodedHeader, err := encodeTokenPart(header)
	if err != nil {
		return "", err
	}
	encodedClaims, err := encodeTokenPart(claims)
	if err != nil {
		return "", err
	}

	unsignedToken := encodedHeader + "." + encodedClaims
	signature := signToken(unsignedToken, auth.JWTSecret)
	return unsignedToken + "." + signature, nil
}

func validateAccessToken(auth config.AuthConfig, token string) (accessTokenClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return accessTokenClaims{}, errors.New("invalid token")
	}

	unsignedToken := parts[0] + "." + parts[1]
	expectedSignature := signToken(unsignedToken, auth.JWTSecret)
	if !hmac.Equal([]byte(parts[2]), []byte(expectedSignature)) {
		return accessTokenClaims{}, errors.New("invalid token signature")
	}

	var header accessTokenHeader
	if err := decodeTokenPart(parts[0], &header); err != nil {
		return accessTokenClaims{}, err
	}
	if header.Algorithm != "HS256" || header.Type != "JWT" {
		return accessTokenClaims{}, errors.New("invalid token header")
	}

	var claims accessTokenClaims
	if err := decodeTokenPart(parts[1], &claims); err != nil {
		return accessTokenClaims{}, err
	}
	if claims.Issuer != auth.Issuer || claims.Subject == "" {
		return accessTokenClaims{}, errors.New("invalid token claims")
	}
	if time.Now().UTC().Unix() >= claims.ExpiresAt {
		return accessTokenClaims{}, errors.New("token expired")
	}

	return claims, nil
}

func encodeTokenPart(value any) (string, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(data), nil
}

func decodeTokenPart(value string, destination any) error {
	data, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, destination)
}

func signToken(unsignedToken string, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(unsignedToken))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func generateSecureToken() (string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}
	return hex.EncodeToString(buffer), nil
}

func hashRefreshToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func authCookieMaxAge(duration time.Duration) int {
	return int(duration.Seconds())
}

func setCookie(c *gin.Context, name string, value string, maxAge int, secure bool) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(name, value, maxAge, "/", "", secure, true)
}

func clearAuthCookies(c *gin.Context, secure bool) {
	setCookie(c, accessTokenCookieName, "", -1, secure)
	setCookie(c, refreshTokenCookieName, "", -1, secure)
}

func userAuthMiddleware(auth config.AuthConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(accessTokenCookieName)
		if err != nil || strings.TrimSpace(token) == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "برای دسترسی وارد حساب کاربری شوید."})
			return
		}

		claims, err := validateAccessToken(auth, token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "نشست کاربری معتبر نیست."})
			return
		}

		c.Set(userIDContextKey, claims.Subject)
		c.Next()
	}
}

func currentUserID(c *gin.Context) (string, bool) {
	value, exists := c.Get(userIDContextKey)
	if !exists {
		return "", false
	}
	userID, ok := value.(string)
	return userID, ok && strings.TrimSpace(userID) != ""
}
