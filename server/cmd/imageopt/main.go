package main

import (
	"flag"
	"fmt"
	"os"

	"melody-server/internal/media"
)

func main() {
	input := flag.String("in", "", "source image path")
	output := flag.String("out", "", "destination .webp path")
	width := flag.Int("width", 1600, "maximum output width")
	quality := flag.Int("quality", media.DefaultWebPQuality, "WebP quality from 1 to 100")
	flag.Parse()

	if *input == "" || *output == "" {
		fmt.Fprintln(os.Stderr, "-in and -out are required")
		os.Exit(2)
	}
	if err := media.ConvertFile(*input, *output, *width, *quality); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
