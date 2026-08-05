package blogcontent

import (
	"bytes"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"unicode"

	"melody-server/internal/models"

	"github.com/microcosm-cc/bluemonday"
	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"
)

type Result struct {
	HTML               string               `json:"html"`
	TableOfContents    []models.BlogTOCItem `json:"tableOfContents"`
	ReadingTimeMinutes int                  `json:"readingTimeMinutes"`
	Warnings           []string             `json:"warnings"`
}

var spacePattern = regexp.MustCompile(`\s+`)

func Process(source string) (Result, error) {
	warnings := make([]string, 0)
	if regexp.MustCompile(`(?i)<\s*h1(?:\s|>)`).MatchString(source) {
		warnings = append(warnings, "تگ H1 از متن حذف شد؛ عنوان مقاله تنها H1 صفحه است.")
	}

	cleaned := policy().Sanitize(source)
	contextNode := &html.Node{Type: html.ElementNode, Data: "div", DataAtom: atom.Div}
	nodes, err := html.ParseFragment(strings.NewReader(cleaned), contextNode)
	if err != nil {
		return Result{}, fmt.Errorf("parse sanitized html: %w", err)
	}

	toc := make([]models.BlogTOCItem, 0)
	wordCount := 0
	lastHeadingLevel := 1
	hasInternalLink := false
	imageWithoutAlt := false
	imageWithoutDimensions := false
	for _, node := range nodes {
		walk(node, func(current *html.Node) {
			if current.Type == html.TextNode && current.Parent != nil && current.Parent.Data != "code" && current.Parent.Data != "pre" {
				wordCount += countWords(current.Data)
			}
			if current.Type != html.ElementNode {
				return
			}
			switch current.Data {
			case "h2", "h3", "h4":
				level := int(current.Data[1] - '0')
				if level > lastHeadingLevel+1 {
					warnings = append(warnings, "ترتیب یکی از headingها بیش از یک سطح پرش دارد.")
				}
				lastHeadingLevel = level
				title := strings.TrimSpace(textContent(current))
				id := fmt.Sprintf("section-%d", len(toc)+1)
				setAttr(current, "id", id)
				if title != "" {
					toc = append(toc, models.BlogTOCItem{ID: id, Title: title, Level: level})
				}
			case "a":
				href := getAttr(current, "href")
				if strings.HasPrefix(href, "/") || strings.HasPrefix(href, "#") {
					hasInternalLink = true
				}
				if parsed, parseErr := url.Parse(href); parseErr == nil && parsed.IsAbs() {
					setAttr(current, "rel", "noopener noreferrer")
					setAttr(current, "target", "_blank")
				}
			case "img":
				if strings.TrimSpace(getAttr(current, "alt")) == "" {
					imageWithoutAlt = true
				}
				if strings.TrimSpace(getAttr(current, "width")) == "" || strings.TrimSpace(getAttr(current, "height")) == "" {
					imageWithoutDimensions = true
				}
				setAttr(current, "loading", "lazy")
				setAttr(current, "decoding", "async")
			}
		})
	}

	if imageWithoutAlt {
		warnings = append(warnings, "حداقل یک تصویر داخل متن alt ندارد.")
	}
	if imageWithoutDimensions {
		warnings = append(warnings, "حداقل یک تصویر داخل متن width یا height ندارد.")
	}
	if !hasInternalLink {
		warnings = append(warnings, "متن هنوز لینک داخلی ندارد.")
	}
	if wordCount < 300 {
		warnings = append(warnings, "محتوا کمتر از ۳۰۰ کلمه است.")
	}

	var output bytes.Buffer
	for _, node := range nodes {
		if err := html.Render(&output, node); err != nil {
			return Result{}, fmt.Errorf("render sanitized html: %w", err)
		}
	}
	minutes := (wordCount + 199) / 200
	if minutes < 1 {
		minutes = 1
	}
	return Result{HTML: output.String(), TableOfContents: toc, ReadingTimeMinutes: minutes, Warnings: unique(warnings)}, nil
}

func policy() *bluemonday.Policy {
	p := bluemonday.NewPolicy()
	p.AllowElements("p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i", "a", "blockquote", "figure", "figcaption", "picture", "source", "img", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "pre", "code", "hr", "br")
	p.AllowAttrs("href", "title").OnElements("a")
	p.AllowAttrs("src", "srcset", "sizes", "alt", "title", "width", "height", "loading", "decoding").OnElements("img")
	p.AllowAttrs("srcset", "sizes", "type", "media").OnElements("source")
	p.AllowAttrs("scope", "colspan", "rowspan").OnElements("th", "td")
	p.AllowURLSchemes("http", "https", "mailto", "tel")
	p.AllowRelativeURLs(true)
	return p
}

func walk(node *html.Node, visit func(*html.Node)) {
	visit(node)
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		walk(child, visit)
	}
}

func textContent(node *html.Node) string {
	var builder strings.Builder
	walk(node, func(current *html.Node) {
		if current.Type == html.TextNode {
			builder.WriteString(current.Data)
			builder.WriteByte(' ')
		}
	})
	return spacePattern.ReplaceAllString(builder.String(), " ")
}

func countWords(value string) int {
	return len(strings.FieldsFunc(value, func(r rune) bool {
		return unicode.IsSpace(r) || strings.ContainsRune("،؛:,.!?؟()[]{}\"'«»/\\|", r)
	}))
}

func getAttr(node *html.Node, key string) string {
	for _, attr := range node.Attr {
		if attr.Key == key {
			return attr.Val
		}
	}
	return ""
}

func setAttr(node *html.Node, key, value string) {
	for index := range node.Attr {
		if node.Attr[index].Key == key {
			node.Attr[index].Val = value
			return
		}
	}
	node.Attr = append(node.Attr, html.Attribute{Key: key, Val: value})
}

func unique(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}
