package blogcontent

import (
	"bytes"
	"fmt"
	"net/url"
	"strings"
	"unicode"

	"melody-server/internal/models"

	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"
)

type ProductLinkRewrite struct {
	AnchorText string
	OldURL     string
	NewURL     string
	Matches    int
}

type ProductLinkValidation struct {
	URL     string
	Matches int
}

type productLinkFilters struct {
	Query           string
	Techniques      []string
	Materials       []string
	Sizes           []string
	UseCases        []string
	Features        []string
	AttachmentTypes []string
}

func RewriteProductLinks(source string, products []models.Product) (string, []ProductLinkRewrite, error) {
	contextNode := &html.Node{Type: html.ElementNode, Data: "div", DataAtom: atom.Div}
	nodes, err := html.ParseFragment(strings.NewReader(source), contextNode)
	if err != nil {
		return "", nil, fmt.Errorf("parse blog html: %w", err)
	}

	rewrites := make([]ProductLinkRewrite, 0)
	for _, node := range nodes {
		walk(node, func(current *html.Node) {
			if current.Type != html.ElementNode || current.Data != "a" {
				return
			}
			oldURL := getAttr(current, "href")
			if !isProductsURL(oldURL) {
				return
			}
			anchor := strings.TrimSpace(textContent(current))
			newURL, matches := contextualProductURL(anchor, oldURL, products)
			if newURL == oldURL {
				return
			}
			setAttr(current, "href", newURL)
			rewrites = append(rewrites, ProductLinkRewrite{AnchorText: anchor, OldURL: oldURL, NewURL: newURL, Matches: matches})
		})
	}

	var output bytes.Buffer
	for _, node := range nodes {
		if err := html.Render(&output, node); err != nil {
			return "", nil, fmt.Errorf("render blog html: %w", err)
		}
	}
	return output.String(), rewrites, nil
}

func RewriteProductCTA(label, text, currentURL string, products []models.Product) (string, int) {
	if !isProductsURL(currentURL) {
		return currentURL, 0
	}
	return contextualProductURL(strings.TrimSpace(label+" "+text), currentURL, products)
}

func ValidateProductLink(link string, products []models.Product) (int, error) {
	parsed, err := url.Parse(link)
	if err != nil {
		return 0, err
	}
	if parsed.Path != "/products" || parsed.Fragment == "" {
		return len(products), nil
	}
	filters, err := parseProductLinkFilters(parsed.Fragment)
	if err != nil {
		return 0, err
	}
	return countMatchingProducts(products, filters), nil
}

func ValidateProductLinks(source string, products []models.Product) ([]ProductLinkValidation, error) {
	contextNode := &html.Node{Type: html.ElementNode, Data: "div", DataAtom: atom.Div}
	nodes, err := html.ParseFragment(strings.NewReader(source), contextNode)
	if err != nil {
		return nil, fmt.Errorf("parse blog html for link validation: %w", err)
	}
	validations := make([]ProductLinkValidation, 0)
	for _, node := range nodes {
		var validationErr error
		walk(node, func(current *html.Node) {
			if validationErr != nil || current.Type != html.ElementNode || current.Data != "a" {
				return
			}
			href := getAttr(current, "href")
			if !isProductsURL(href) || !strings.Contains(href, "#") {
				return
			}
			matches, err := ValidateProductLink(href, products)
			if err != nil {
				validationErr = err
				return
			}
			if matches == 0 {
				validationErr = fmt.Errorf("filtered product link has no results: %s", href)
				return
			}
			validations = append(validations, ProductLinkValidation{URL: href, Matches: matches})
		})
		if validationErr != nil {
			return nil, validationErr
		}
	}
	return validations, nil
}

func CountProductLinks(source string) (int, error) {
	contextNode := &html.Node{Type: html.ElementNode, Data: "div", DataAtom: atom.Div}
	nodes, err := html.ParseFragment(strings.NewReader(source), contextNode)
	if err != nil {
		return 0, fmt.Errorf("parse blog html for link count: %w", err)
	}
	count := 0
	for _, node := range nodes {
		walk(node, func(current *html.Node) {
			if current.Type == html.ElementNode && current.Data == "a" && isProductsURL(getAttr(current, "href")) {
				count++
			}
		})
	}
	return count, nil
}

func contextualProductURL(anchor, currentURL string, products []models.Product) (string, int) {
	normalized := normalizeLinkText(anchor)
	if containsAny(normalized, "ارسال عکس لباس", "ارسال عکس", "ارسال کالکشن") {
		return "/custom-order", 0
	}
	if containsAny(normalized, "نمونه درس ویدیویی", "نمونه درس ویدئویی", "درس ویدیویی", "درس ویدئویی") {
		return "/courses", 0
	}

	filters := filtersForAnchor(normalized)
	if filters.empty() {
		if strings.Contains(currentURL, "#") {
			return currentURL, 0
		}
		return "/products", len(products)
	}

	// Feature and attachment metadata must be explicit. Do not create a partial
	// contextual link when the requested property has no real product result.
	for _, value := range filters.Features {
		if countMatchingProducts(products, productLinkFilters{Features: []string{value}}) == 0 {
			return "/products", len(products)
		}
	}
	for _, value := range filters.AttachmentTypes {
		if countMatchingProducts(products, productLinkFilters{AttachmentTypes: []string{value}}) == 0 {
			return "/products", len(products)
		}
	}

	matches := countMatchingProducts(products, filters)
	if matches == 0 {
		return "/products", len(products)
	}
	return "/products#" + filters.fragment(), matches
}

func filtersForAnchor(value string) productLinkFilters {
	filters := productLinkFilters{}
	add := func(values *[]string, value string) {
		for _, existing := range *values {
			if existing == value {
				return
			}
		}
		*values = append(*values, value)
	}

	if strings.Contains(value, "کریشه") {
		add(&filters.Techniques, "kerisheh")
	}
	if strings.Contains(value, "فشن") {
		add(&filters.Techniques, "fashion")
	}
	if containsAny(value, "استامپ ورک", "استامپ‌ورک") {
		add(&filters.Techniques, "stumpwork")
	}
	if containsAny(value, "سه بعدی", "سه‌بعدی") {
		add(&filters.Techniques, "three_dimensional")
	}
	if strings.Contains(value, "حریر") {
		add(&filters.Materials, "chiffon")
	}
	if strings.Contains(value, "ساتن") {
		add(&filters.Materials, "satin")
	}
	if strings.Contains(value, "مخمل") {
		add(&filters.Materials, "velvet")
	}
	if containsAny(value, "لباس عروس", "عروس", "عقد", "نامزدی") {
		add(&filters.UseCases, "wedding_dress")
	}
	if containsAny(value, "کت", "مانتو") {
		add(&filters.UseCases, "coat_manto")
	}
	if containsAny(value, "لباس مجلسی", "مجلسی") {
		add(&filters.UseCases, "evening_dress")
	}
	if containsAny(value, "خیلی بزرگ") {
		add(&filters.Sizes, "extra_large")
	} else if strings.Contains(value, "بزرگ") {
		add(&filters.Sizes, "large")
	}
	if strings.Contains(value, "متوسط") {
		add(&filters.Sizes, "medium")
	}
	if strings.Contains(value, "کوچک") {
		add(&filters.Sizes, "small")
	}
	if containsAny(value, "گل سینه", "گل‌سینه") {
		add(&filters.AttachmentTypes, "pin")
	}
	if strings.Contains(value, "مشکی") {
		filters.Query = "مشکی"
	}
	if containsAny(value, "گل سبک", "گل پارچه ای سبک", "گل پارچه‌ای سبک", "گل های سبک", "گل‌های سبک", "سبک وزن") {
		add(&filters.Features, "lightweight")
	}
	if containsAny(value, "جداشونده", "جدا شونده") {
		add(&filters.Features, "detachable")
	}
	if strings.Contains(value, "گیره") {
		add(&filters.AttachmentTypes, "clip")
	}
	if containsAny(value, "دوخت", "دوخته") {
		add(&filters.AttachmentTypes, "sewn")
	}
	return filters
}

func (filters productLinkFilters) empty() bool {
	return filters.Query == "" && len(filters.Techniques) == 0 && len(filters.Materials) == 0 && len(filters.Sizes) == 0 &&
		len(filters.UseCases) == 0 && len(filters.Features) == 0 && len(filters.AttachmentTypes) == 0
}

func (filters productLinkFilters) fragment() string {
	values := url.Values{}
	if filters.Query != "" {
		values.Set("q", filters.Query)
	}
	setFilterValue(values, "technique", filters.Techniques, map[string]string{"three_dimensional": "three-dimensional"})
	setFilterValue(values, "material", filters.Materials, nil)
	setFilterValue(values, "size", filters.Sizes, map[string]string{"extra_large": "extra-large"})
	setFilterValue(values, "use", filters.UseCases, map[string]string{
		"evening_dress": "evening-dress", "wedding_dress": "wedding-dress", "coat_manto": "coat-manto", "hair_accessory": "hair-accessory",
	})
	setFilterValue(values, "feature", filters.Features, nil)
	setFilterValue(values, "attachment", filters.AttachmentTypes, nil)
	return values.Encode()
}

func setFilterValue(values url.Values, key string, selected []string, aliases map[string]string) {
	if len(selected) == 0 {
		return
	}
	encoded := make([]string, 0, len(selected))
	for _, value := range selected {
		if alias := aliases[value]; alias != "" {
			value = alias
		}
		encoded = append(encoded, value)
	}
	values.Set(key, strings.Join(encoded, ","))
}

func parseProductLinkFilters(fragment string) (productLinkFilters, error) {
	values, err := url.ParseQuery(fragment)
	if err != nil {
		return productLinkFilters{}, err
	}
	filters := productLinkFilters{Query: values.Get("q")}
	allowed := map[string]map[string]string{
		"technique":  {"kerisheh": "kerisheh", "fashion": "fashion", "stumpwork": "stumpwork", "classic": "classic", "three-dimensional": "three_dimensional"},
		"material":   {"chiffon": "chiffon", "satin": "satin", "organza": "organza", "velvet": "velvet", "tulle": "tulle", "crepe": "crepe", "mixed": "mixed"},
		"size":       {"small": "small", "medium": "medium", "large": "large", "extra-large": "extra_large"},
		"use":        {"evening-dress": "evening_dress", "wedding-dress": "wedding_dress", "coat-manto": "coat_manto", "hat": "hat", "hair-accessory": "hair_accessory", "multipurpose": "multipurpose"},
		"feature":    {"lightweight": "lightweight", "detachable": "detachable"},
		"attachment": {"pin": "pin", "clip": "clip", "sewn": "sewn"},
	}
	targets := map[string]*[]string{
		"technique": &filters.Techniques, "material": &filters.Materials, "size": &filters.Sizes,
		"use": &filters.UseCases, "feature": &filters.Features, "attachment": &filters.AttachmentTypes,
	}
	for key := range values {
		if key == "q" {
			continue
		}
		if _, ok := allowed[key]; !ok {
			return productLinkFilters{}, fmt.Errorf("unknown product filter key %q", key)
		}
	}
	for key, target := range targets {
		for _, value := range strings.Split(values.Get(key), ",") {
			if value == "" {
				continue
			}
			canonical, ok := allowed[key][value]
			if !ok {
				return productLinkFilters{}, fmt.Errorf("invalid %s filter value %q", key, value)
			}
			*target = append(*target, canonical)
		}
	}
	return filters, nil
}

func countMatchingProducts(products []models.Product, filters productLinkFilters) int {
	count := 0
	for _, product := range products {
		if matchesProductLinkFilters(product, filters) {
			count++
		}
	}
	return count
}

func matchesProductLinkFilters(product models.Product, filters productLinkFilters) bool {
	if filters.Query != "" {
		query := normalizeLinkText(filters.Query)
		haystack := normalizeLinkText(strings.Join([]string{
			product.Title, product.ShortDescription, product.Description, product.UsageLabel, product.Category,
			strings.Join(product.Colors, " "), productColorSearchLabels(product.Colors),
		}, " "))
		for _, term := range strings.Fields(query) {
			if !strings.Contains(haystack, term) {
				return false
			}
		}
	}
	if !matchesAny(product.Techniques, filters.Techniques) || !matchesAny(product.Materials, filters.Materials) ||
		!matchesAny(product.UseCases, filters.UseCases) || !matchesAny(product.Features, filters.Features) ||
		!matchesAny(product.AttachmentTypes, filters.AttachmentTypes) {
		return false
	}
	if len(filters.Sizes) > 0 && !containsString(filters.Sizes, productSize(product.DiameterCM)) {
		return false
	}
	return true
}

func matchesAny(productValues, selected []string) bool {
	if len(selected) == 0 {
		return true
	}
	for _, value := range selected {
		if containsString(productValues, value) {
			return true
		}
	}
	return false
}

func productSize(value *float64) string {
	if value == nil || *value <= 0 {
		return ""
	}
	if *value < 8 {
		return "small"
	}
	if *value < 15 {
		return "medium"
	}
	if *value <= 25 {
		return "large"
	}
	return "extra_large"
}

func productColorSearchLabels(colors []string) string {
	labels := map[string]string{
		"white": "سفید", "black": "مشکی سیاه", "cream": "کرم", "ivory": "شیری", "pink": "صورتی", "red": "قرمز",
		"blue": "آبی", "green": "سبز", "gold": "طلایی", "silver": "نقره ای نقره‌ای", "purple": "بنفش", "multicolor": "چندرنگ چند رنگ",
	}
	values := make([]string, 0, len(colors))
	for _, color := range colors {
		values = append(values, labels[color])
	}
	return strings.Join(values, " ")
}

func normalizeLinkText(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.NewReplacer("ي", "ی", "ى", "ی", "ك", "ک", "‌", " ", "‍", " ", "ـ", "").Replace(value)
	value = strings.Map(func(r rune) rune {
		if unicode.Is(unicode.Mn, r) {
			return -1
		}
		return r
	}, value)
	return strings.Join(strings.Fields(value), " ")
}

func isProductsURL(value string) bool {
	parsed, err := url.Parse(strings.TrimSpace(value))
	if err != nil {
		return false
	}
	return parsed.Path == "/products" && (parsed.Host == "" || parsed.Host == "golmelo.com" || parsed.Host == "www.golmelo.com")
}

func containsAny(value string, candidates ...string) bool {
	for _, candidate := range candidates {
		if strings.Contains(value, normalizeLinkText(candidate)) {
			return true
		}
	}
	return false
}

func containsString(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}
