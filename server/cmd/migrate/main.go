package main

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"os"
	"time"

	"melody-server/internal/config"
	"melody-server/internal/database"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

type mongoContactRequest struct {
	ID        primitive.ObjectID `bson:"_id"`
	FullName  string             `bson:"fullName"`
	Contact   string             `bson:"contact"`
	Message   string             `bson:"message"`
	CreatedAt time.Time          `bson:"createdAt"`
}

type mongoCourseSignup struct {
	ID        primitive.ObjectID `bson:"_id"`
	Phone     string             `bson:"phone"`
	CreatedAt time.Time          `bson:"createdAt"`
}

type mongoImageDocument struct {
	ID          primitive.ObjectID `bson:"_id"`
	Filename    string             `bson:"filename"`
	Alt         string             `bson:"alt"`
	ContentType string             `bson:"contentType"`
	Data        []byte             `bson:"data"`
	SortOrder   int                `bson:"sortOrder"`
	CreatedAt   time.Time          `bson:"createdAt"`
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, using environment variables")
	}

	cfg := config.Load()

	pgDB, err := database.NewPostgresDB(cfg.Database)
	if err != nil {
		log.Fatalf("postgres connection failed: %v", err)
	}
	defer pgDB.Close()

	mongoClient, mongoDB, err := connectMongo()
	if err != nil {
		log.Fatalf("mongo connection failed: %v", err)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = mongoClient.Disconnect(ctx)
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	if err := migrateContactRequests(ctx, mongoDB, pgDB); err != nil {
		log.Fatalf("migrate contact requests failed: %v", err)
	}
	if err := migrateCourseSignups(ctx, mongoDB, pgDB); err != nil {
		log.Fatalf("migrate course signups failed: %v", err)
	}
	if err := migrateImages(ctx, mongoDB, pgDB, "project_images"); err != nil {
		log.Fatalf("migrate project images failed: %v", err)
	}
	if err := migrateImages(ctx, mongoDB, pgDB, "hero_slides"); err != nil {
		log.Fatalf("migrate hero slides failed: %v", err)
	}

	log.Println("mongo -> postgres migration completed successfully")
}

func connectMongo() (*mongo.Client, *mongo.Database, error) {
	mongoURI := os.Getenv("MONGODB_URI")
	databaseName := getEnv("MONGODB_NAME", getEnv("DB_NAME", "melody"))
	if mongoURI == "" {
		host := getEnv("MONGODB_HOST", getEnv("DB_HOST", "localhost"))
		port := getEnv("MONGODB_PORT", "27017")
		username := getEnv("MONGO_INITDB_ROOT_USERNAME", getEnv("DB_USER", ""))
		password := getEnv("MONGO_INITDB_ROOT_PASSWORD", getEnv("DB_PASSWORD", ""))

		if username == "" {
			mongoURI = fmt.Sprintf("mongodb://%s:%s/%s", host, port, databaseName)
		} else {
			credentials := url.UserPassword(username, password).String()
			mongoURI = fmt.Sprintf("mongodb://%s@%s:%s/%s?authSource=admin", credentials, host, port, databaseName)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI).SetServerSelectionTimeout(8*time.Second))
	if err != nil {
		return nil, nil, fmt.Errorf("connect mongo: %w", err)
	}
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		_ = client.Disconnect(ctx)
		return nil, nil, fmt.Errorf("ping mongo: %w", err)
	}

	return client, client.Database(databaseName), nil
}

func migrateContactRequests(ctx context.Context, mongoDB *mongo.Database, pgDB *database.PostgresDB) error {
	cursor, err := mongoDB.Collection("contact_requests").Find(ctx, bson.D{}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}}))
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	count := 0
	for cursor.Next(ctx) {
		var doc mongoContactRequest
		if err := cursor.Decode(&doc); err != nil {
			return err
		}

		_, err := pgDB.Pool().Exec(
			ctx,
			`INSERT INTO contact_requests (id, full_name, contact, message, created_at)
			 VALUES ($1, $2, $3, $4, $5)
			 ON CONFLICT (id) DO UPDATE SET
			 full_name = EXCLUDED.full_name,
			 contact = EXCLUDED.contact,
			 message = EXCLUDED.message,
			 created_at = EXCLUDED.created_at`,
			doc.ID.Hex(),
			doc.FullName,
			doc.Contact,
			doc.Message,
			doc.CreatedAt,
		)
		if err != nil {
			return err
		}
		count++
	}
	if err := cursor.Err(); err != nil {
		return err
	}

	log.Printf("migrated %d contact requests", count)
	return nil
}

func migrateCourseSignups(ctx context.Context, mongoDB *mongo.Database, pgDB *database.PostgresDB) error {
	cursor, err := mongoDB.Collection("course_signups").Find(ctx, bson.D{}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}}))
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	count := 0
	for cursor.Next(ctx) {
		var doc mongoCourseSignup
		if err := cursor.Decode(&doc); err != nil {
			return err
		}

		_, err := pgDB.Pool().Exec(
			ctx,
			`INSERT INTO course_signups (id, phone, created_at)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (id) DO UPDATE SET
			 phone = EXCLUDED.phone,
			 created_at = EXCLUDED.created_at`,
			doc.ID.Hex(),
			doc.Phone,
			doc.CreatedAt,
		)
		if err != nil {
			return err
		}
		count++
	}
	if err := cursor.Err(); err != nil {
		return err
	}

	log.Printf("migrated %d course signups", count)
	return nil
}

func migrateImages(ctx context.Context, mongoDB *mongo.Database, pgDB *database.PostgresDB, collectionName string) error {
	total, err := mongoDB.Collection(collectionName).CountDocuments(ctx, bson.D{})
	if err != nil {
		return err
	}
	if total == 0 {
		log.Printf("no docs found for %s; skipping image migration", collectionName)
		return nil
	}

	if _, err := pgDB.Pool().Exec(ctx, fmt.Sprintf(`DELETE FROM %s`, collectionName)); err != nil {
		return err
	}

	cursor, err := mongoDB.Collection(collectionName).Find(ctx, bson.D{}, options.Find().SetSort(bson.D{{Key: "sortOrder", Value: 1}, {Key: "createdAt", Value: 1}}))
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	query := fmt.Sprintf(`INSERT INTO %s (id, filename, alt, content_type, data, sort_order, created_at)
	 VALUES ($1, $2, $3, $4, $5, $6, $7)
	 ON CONFLICT (id) DO UPDATE SET
	 filename = EXCLUDED.filename,
	 alt = EXCLUDED.alt,
	 content_type = EXCLUDED.content_type,
	 data = EXCLUDED.data,
	 sort_order = EXCLUDED.sort_order,
	 created_at = EXCLUDED.created_at`, collectionName)

	count := 0
	for cursor.Next(ctx) {
		var doc mongoImageDocument
		if err := cursor.Decode(&doc); err != nil {
			return err
		}

		_, err := pgDB.Pool().Exec(
			ctx,
			query,
			doc.ID.Hex(),
			doc.Filename,
			doc.Alt,
			doc.ContentType,
			doc.Data,
			doc.SortOrder,
			doc.CreatedAt,
		)
		if err != nil {
			return err
		}
		count++
	}
	if err := cursor.Err(); err != nil {
		return err
	}

	log.Printf("migrated %d docs for %s", count, collectionName)
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
