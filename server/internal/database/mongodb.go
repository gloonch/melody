package database

import (
	"context"
	"fmt"
	"time"

	"melody-server/internal/config"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

type MongoDB struct {
	client   *mongo.Client
	database *mongo.Database
}

func NewMongoDB(cfg config.DatabaseConfig) (*MongoDB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.ConnectTimeout)*time.Second)
	defer cancel()

	clientOptions := options.Client().
		ApplyURI(cfg.URI).
		SetMaxPoolSize(cfg.MaxPoolSize).
		SetMinPoolSize(cfg.MinPoolSize).
		SetMaxConnIdleTime(30 * time.Minute).
		SetServerSelectionTimeout(5 * time.Second)

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, fmt.Errorf("connect mongodb: %w", err)
	}

	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		return nil, fmt.Errorf("ping mongodb: %w", err)
	}

	db := &MongoDB{
		client:   client,
		database: client.Database(cfg.Name),
	}

	if err := db.createIndexes(ctx); err != nil {
		return nil, err
	}

	return db, nil
}

func (m *MongoDB) Disconnect(ctx context.Context) error {
	return m.client.Disconnect(ctx)
}

func (m *MongoDB) ContactRequests() *mongo.Collection {
	return m.database.Collection("contact_requests")
}

func (m *MongoDB) CourseSignups() *mongo.Collection {
	return m.database.Collection("course_signups")
}

func (m *MongoDB) ProjectImages() *mongo.Collection {
	return m.database.Collection("project_images")
}

func (m *MongoDB) HeroSlides() *mongo.Collection {
	return m.database.Collection("hero_slides")
}

func (m *MongoDB) createIndexes(ctx context.Context) error {
	contactIndexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "createdAt", Value: -1}}},
		{Keys: bson.D{{Key: "contact", Value: 1}}},
	}
	if _, err := m.ContactRequests().Indexes().CreateMany(ctx, contactIndexes); err != nil {
		return fmt.Errorf("create contact request indexes: %w", err)
	}

	courseSignupIndexes := []mongo.IndexModel{
		{Keys: bson.D{{Key: "createdAt", Value: -1}}},
		{Keys: bson.D{{Key: "phone", Value: 1}}},
	}
	if _, err := m.CourseSignups().Indexes().CreateMany(ctx, courseSignupIndexes); err != nil {
		return fmt.Errorf("create course signup indexes: %w", err)
	}

	imageIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "filename", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{Keys: bson.D{{Key: "sortOrder", Value: 1}}},
	}
	if _, err := m.ProjectImages().Indexes().CreateMany(ctx, imageIndexes); err != nil {
		return fmt.Errorf("create project image indexes: %w", err)
	}

	heroSlideIndexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "filename", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{Keys: bson.D{{Key: "sortOrder", Value: 1}}},
	}
	if _, err := m.HeroSlides().Indexes().CreateMany(ctx, heroSlideIndexes); err != nil {
		return fmt.Errorf("create hero slide indexes: %w", err)
	}

	return nil
}
