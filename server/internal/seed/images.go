package seed

import (
	"context"
	"errors"
	"fmt"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"melody-server/internal/database"
	"melody-server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var allowedImageExtensions = map[string]struct{}{
	".jpg":  {},
	".jpeg": {},
	".png":  {},
	".webp": {},
}

func ProjectImages(ctx context.Context, db *database.MongoDB, dir string) error {
	if dir == "" {
		return nil
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			log.Printf("project image seed skipped: %s does not exist", dir)
			return nil
		}
		return fmt.Errorf("read project image seed directory: %w", err)
	}

	existing, err := existingFilenames(ctx, db)
	if err != nil {
		return err
	}

	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		ext := strings.ToLower(filepath.Ext(name))
		if _, ok := allowedImageExtensions[ext]; ok {
			names = append(names, name)
		}
	}
	sort.Strings(names)

	now := time.Now().UTC()
	documents := make([]interface{}, 0, len(names))
	for index, name := range names {
		if _, ok := existing[name]; ok {
			continue
		}

		fullPath := filepath.Join(dir, name)
		data, err := os.ReadFile(fullPath)
		if err != nil {
			return fmt.Errorf("read seed image %s: %w", fullPath, err)
		}

		documents = append(documents, models.ProjectImage{
			Filename:    name,
			Alt:         fmt.Sprintf("نمونه‌کار %d", index+1),
			ContentType: detectContentType(name, data),
			Data:        data,
			SortOrder:   index,
			CreatedAt:   now,
		})
	}

	if len(documents) == 0 {
		return nil
	}

	if _, err := db.ProjectImages().InsertMany(ctx, documents); err != nil {
		return fmt.Errorf("insert seed project images: %w", err)
	}

	log.Printf("seeded %d project images from %s", len(documents), dir)
	return nil
}

func existingFilenames(ctx context.Context, db *database.MongoDB) (map[string]struct{}, error) {
	cursor, err := db.ProjectImages().Find(ctx, bson.D{}, options.Find().SetProjection(bson.M{"filename": 1}))
	if err != nil {
		return nil, fmt.Errorf("query existing project images: %w", err)
	}
	defer cursor.Close(ctx)

	existing := make(map[string]struct{})
	for cursor.Next(ctx) {
		var row struct {
			Filename string `bson:"filename"`
		}
		if err := cursor.Decode(&row); err != nil {
			return nil, fmt.Errorf("decode existing project image: %w", err)
		}
		existing[row.Filename] = struct{}{}
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate existing project images: %w", err)
	}

	return existing, nil
}

func detectContentType(filename string, data []byte) string {
	if contentType := mime.TypeByExtension(strings.ToLower(filepath.Ext(filename))); contentType != "" {
		return contentType
	}

	sampleSize := len(data)
	if sampleSize > 512 {
		sampleSize = 512
	}
	return http.DetectContentType(data[:sampleSize])
}
