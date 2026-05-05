package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	App      AppConfig
	Database DatabaseConfig
	Seed     SeedConfig
	Admin    AdminConfig
}

type AppConfig struct {
	Environment    string
	Port           string
	BaseURL        string
	AllowedOrigins []string
}

type DatabaseConfig struct {
	URI            string
	Name           string
	ConnectTimeout int
	MaxPoolSize    uint64
	MinPoolSize    uint64
}

type SeedConfig struct {
	ProjectImagesDir string
}

type AdminConfig struct {
	Username string
	Password string
	Token    string
}

func Load() *Config {
	databaseName := getEnv("MONGODB_NAME", getEnv("DB_NAME", "melody"))

	return &Config{
		App: AppConfig{
			Environment:    getEnv("ENVIRONMENT", getEnv("APP_ENV", "development")),
			Port:           getEnv("PORT", "8080"),
			BaseURL:        strings.TrimRight(getEnv("BASE_URL", "http://localhost:8080"), "/"),
			AllowedOrigins: splitCSV(getEnv("ALLOWED_ORIGINS", "http://localhost:5173")),
		},
		Database: DatabaseConfig{
			URI:            mongoURI(databaseName),
			Name:           databaseName,
			ConnectTimeout: getEnvAsInt("MONGODB_CONNECT_TIMEOUT", 30),
			MaxPoolSize:    uint64(getEnvAsInt("MONGODB_MAX_POOL_SIZE", 100)),
			MinPoolSize:    uint64(getEnvAsInt("MONGODB_MIN_POOL_SIZE", 2)),
		},
		Seed: SeedConfig{
			ProjectImagesDir: getEnv("PROJECT_IMAGES_DIR", "assets/project_images"),
		},
		Admin: AdminConfig{
			Username: getEnv("ADMIN_USERNAME", "admin"),
			Password: getEnv("ADMIN_PASSWORD", "admin@123!"),
			Token:    getEnv("ADMIN_TOKEN", "melody-admin-dev-token"),
		},
	}
}

func mongoURI(databaseName string) string {
	if uri := os.Getenv("MONGODB_URI"); uri != "" {
		return uri
	}

	host := getEnv("MONGODB_HOST", getEnv("DB_HOST", "localhost"))
	port := getEnv("MONGODB_PORT", "27017")
	username := getEnv("MONGO_INITDB_ROOT_USERNAME", getEnv("DB_USER", ""))
	password := getEnv("MONGO_INITDB_ROOT_PASSWORD", getEnv("DB_PASSWORD", ""))

	if username == "" {
		return fmt.Sprintf("mongodb://%s:%s/%s", host, port, databaseName)
	}

	credentials := url.UserPassword(username, password).String()
	return fmt.Sprintf("mongodb://%s@%s:%s/%s?authSource=admin", credentials, host, port, databaseName)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
