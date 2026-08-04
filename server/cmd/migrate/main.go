package main

import (
	"context"
	"log"
	"time"

	"melody-server/internal/config"
	"melody-server/internal/database"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("configuration failed: %v", err)
	}
	db, err := database.NewPostgresDB(cfg.Database)
	if err != nil {
		log.Fatalf("migration failed: %v", err)
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := db.VerifyBlogSchema(ctx); err != nil {
		log.Fatalf("migration verification failed: %v", err)
	}
	log.Println("database migrations and blog schema verification completed")
}
