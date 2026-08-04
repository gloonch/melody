package media

import (
	"bytes"
	"fmt"
	"image"
	"os"
	"os/exec"
	"strconv"
)

const DefaultWebPQuality = 82

var ResponsiveWidths = []int{240, 480, 720, 960, 1600}
var BlogResponsiveWidths = []int{480, 768, 1200}

type Variant struct {
	Width  int
	Height int
	Data   []byte
}

func BuildWebPVariants(data []byte, _ string) ([]Variant, error) {
	return BuildWebPVariantsForWidths(data, ResponsiveWidths)
}

func BuildWebPVariantsForWidths(data []byte, widths []int) ([]Variant, error) {
	source, err := os.CreateTemp("", "golmelo-source-*")
	if err != nil {
		return nil, err
	}
	sourcePath := source.Name()
	defer os.Remove(sourcePath)
	if _, err := source.Write(data); err != nil {
		source.Close()
		return nil, err
	}
	if err := source.Close(); err != nil {
		return nil, err
	}

	variants := make([]Variant, 0, len(widths))
	for _, width := range widths {
		output, err := os.CreateTemp("", "golmelo-variant-*.webp")
		if err != nil {
			return nil, err
		}
		outputPath := output.Name()
		output.Close()
		defer os.Remove(outputPath)

		if err := convert(sourcePath, outputPath, width, DefaultWebPQuality); err != nil {
			return nil, err
		}
		encoded, err := os.ReadFile(outputPath)
		if err != nil {
			return nil, err
		}
		config, _, err := image.DecodeConfig(bytes.NewReader(encoded))
		if err != nil {
			return nil, fmt.Errorf("read generated WebP dimensions: %w", err)
		}
		variants = append(variants, Variant{Width: config.Width, Height: config.Height, Data: encoded})
	}
	return variants, nil
}

func BuildBlogOGImage(data []byte) ([]byte, error) {
	config, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	cropWidth, cropHeight := config.Width, config.Height
	targetRatio := float64(1200) / float64(630)
	if float64(cropWidth)/float64(cropHeight) > targetRatio {
		cropWidth = int(float64(cropHeight) * targetRatio)
	} else {
		cropHeight = int(float64(cropWidth) / targetRatio)
	}
	cropX := (config.Width - cropWidth) / 2
	cropY := (config.Height - cropHeight) / 2

	source, err := os.CreateTemp("", "golmelo-og-source-*")
	if err != nil {
		return nil, err
	}
	sourcePath := source.Name()
	defer os.Remove(sourcePath)
	if _, err := source.Write(data); err != nil {
		source.Close()
		return nil, err
	}
	if err := source.Close(); err != nil {
		return nil, err
	}
	output, err := os.CreateTemp("", "golmelo-og-*.webp")
	if err != nil {
		return nil, err
	}
	outputPath := output.Name()
	output.Close()
	defer os.Remove(outputPath)

	command := exec.Command(
		"cwebp", "-quiet", "-q", strconv.Itoa(DefaultWebPQuality), "-m", "4", "-metadata", "none",
		"-crop", strconv.Itoa(cropX), strconv.Itoa(cropY), strconv.Itoa(cropWidth), strconv.Itoa(cropHeight),
		"-resize", "1200", "630", sourcePath, "-o", outputPath,
	)
	if outputText, err := command.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("run cwebp for OG image: %w: %s", err, outputText)
	}
	return os.ReadFile(outputPath)
}

func ConvertFile(inputPath, outputPath string, width, quality int) error {
	return convert(inputPath, outputPath, width, quality)
}

func convert(inputPath, outputPath string, width, quality int) error {
	if width <= 0 {
		return fmt.Errorf("image width must be positive")
	}
	if quality <= 0 || quality > 100 {
		quality = DefaultWebPQuality
	}
	command := exec.Command(
		"cwebp", "-quiet", "-q", strconv.Itoa(quality), "-m", "4", "-metadata", "none",
		"-resize", strconv.Itoa(width), "0", inputPath, "-o", outputPath,
	)
	if output, err := command.CombinedOutput(); err != nil {
		return fmt.Errorf("run cwebp: %w: %s", err, output)
	}
	return nil
}
