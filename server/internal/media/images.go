package media

import (
	"fmt"
	"os"
	"os/exec"
	"strconv"
)

const DefaultWebPQuality = 82

var ResponsiveWidths = []int{480, 960, 1600}

type Variant struct {
	Width int
	Data  []byte
}

func BuildWebPVariants(data []byte, _ string) ([]Variant, error) {
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

	variants := make([]Variant, 0, len(ResponsiveWidths))
	for _, width := range ResponsiveWidths {
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
		variants = append(variants, Variant{Width: width, Data: encoded})
	}
	return variants, nil
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
