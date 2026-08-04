package media

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"net/http"
	"strings"

	_ "golang.org/x/image/webp"
)

const (
	MaxBlogImageBytes     = 8 << 20
	MaxBlogImageDimension = 6000
)

type ValidatedImage struct {
	Data        []byte
	ContentType string
	Extension   string
	Width       int
	Height      int
}

func ValidateBlogImage(data []byte) (ValidatedImage, error) {
	if len(data) == 0 {
		return ValidatedImage{}, fmt.Errorf("فایل تصویر خالی است.")
	}
	if len(data) > MaxBlogImageBytes {
		return ValidatedImage{}, fmt.Errorf("حجم هر تصویر مقاله باید حداکثر ۸ مگابایت باشد.")
	}

	contentType := http.DetectContentType(data)
	extension := ""
	switch contentType {
	case "image/jpeg":
		extension = ".jpg"
	case "image/png":
		extension = ".png"
	case "image/webp":
		extension = ".webp"
	default:
		return ValidatedImage{}, fmt.Errorf("فرمت تصویر باید JPG، PNG یا WebP باشد.")
	}

	config, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || !matchesDetectedFormat(contentType, format) {
		return ValidatedImage{}, fmt.Errorf("محتوای واقعی فایل تصویر معتبر نیست.")
	}
	if config.Width < 1 || config.Height < 1 || config.Width > MaxBlogImageDimension || config.Height > MaxBlogImageDimension {
		return ValidatedImage{}, fmt.Errorf("ابعاد تصویر باید حداکثر ۶۰۰۰ در ۶۰۰۰ پیکسل باشد.")
	}

	cleaned, err := stripImageMetadata(data, contentType)
	if err != nil {
		return ValidatedImage{}, fmt.Errorf("پاک‌سازی metadata تصویر انجام نشد.")
	}
	return ValidatedImage{Data: cleaned, ContentType: contentType, Extension: extension, Width: config.Width, Height: config.Height}, nil
}

func matchesDetectedFormat(contentType, decodedFormat string) bool {
	return contentType == "image/jpeg" && decodedFormat == "jpeg" ||
		contentType == "image/png" && decodedFormat == "png" ||
		contentType == "image/webp" && decodedFormat == "webp"
}

func stripImageMetadata(data []byte, contentType string) ([]byte, error) {
	switch contentType {
	case "image/jpeg", "image/png":
		decoded, _, err := image.Decode(bytes.NewReader(data))
		if err != nil {
			return nil, err
		}
		var output bytes.Buffer
		if contentType == "image/jpeg" {
			err = jpeg.Encode(&output, decoded, &jpeg.Options{Quality: 94})
		} else {
			err = png.Encode(&output, decoded)
		}
		if err != nil {
			return nil, err
		}
		return output.Bytes(), nil
	case "image/webp":
		return stripWebPMetadata(data)
	default:
		return nil, fmt.Errorf("unsupported image type")
	}
}

func stripWebPMetadata(data []byte) ([]byte, error) {
	if len(data) < 12 || string(data[:4]) != "RIFF" || string(data[8:12]) != "WEBP" {
		return nil, fmt.Errorf("invalid webp container")
	}
	var chunks bytes.Buffer
	for offset := 12; offset < len(data); {
		if offset+8 > len(data) {
			return nil, fmt.Errorf("truncated webp chunk")
		}
		kind := string(data[offset : offset+4])
		size := int(binary.LittleEndian.Uint32(data[offset+4 : offset+8]))
		end := offset + 8 + size
		paddedEnd := end + size%2
		if size < 0 || end < offset || paddedEnd > len(data) {
			return nil, fmt.Errorf("invalid webp chunk size")
		}
		if !strings.EqualFold(kind, "EXIF") && !strings.EqualFold(kind, "XMP ") && !strings.EqualFold(kind, "ICCP") {
			chunk := append([]byte(nil), data[offset:paddedEnd]...)
			if kind == "VP8X" && size >= 1 {
				chunk[8] &^= 0x2c
			}
			chunks.Write(chunk)
		}
		offset = paddedEnd
	}

	result := make([]byte, 12+chunks.Len())
	copy(result[:4], "RIFF")
	binary.LittleEndian.PutUint32(result[4:8], uint32(len(result)-8))
	copy(result[8:12], "WEBP")
	copy(result[12:], chunks.Bytes())
	return result, nil
}
