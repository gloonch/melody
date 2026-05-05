package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ContactRequest struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	FullName  string             `bson:"fullName"`
	Contact   string             `bson:"contact"`
	Message   string             `bson:"message"`
	CreatedAt time.Time          `bson:"createdAt"`
}

type CourseSignup struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	Phone     string             `bson:"phone"`
	CreatedAt time.Time          `bson:"createdAt"`
}

type ImageDocument struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"`
	Filename    string             `bson:"filename"`
	Alt         string             `bson:"alt"`
	ContentType string             `bson:"contentType"`
	Data        []byte             `bson:"data"`
	SortOrder   int                `bson:"sortOrder"`
	CreatedAt   time.Time          `bson:"createdAt"`
}

type ProjectImage = ImageDocument

type HeroSlide = ImageDocument
