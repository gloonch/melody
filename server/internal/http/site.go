package httpapi

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"melody-server/internal/models"
	"melody-server/internal/repository"

	"github.com/gin-gonic/gin"
)

const seoHeadMarker = "<!-- __SEO_HEAD__ -->"

type siteMetadata struct {
	Title          string
	Description    string
	Canonical      string
	Image          string
	PageType       string
	Robots         string
	PreloadImage   string
	PreloadSources []models.ImageSource
	JSONLD         []any
}

type sitemapURL struct {
	Loc     string `xml:"loc"`
	LastMod string `xml:"lastmod,omitempty"`
}

type sitemapDocument struct {
	XMLName xml.Name     `xml:"urlset"`
	Xmlns   string       `xml:"xmlns,attr"`
	URLs    []sitemapURL `xml:"url"`
}

func (h *Handler) SiteShell(c *gin.Context) {
	path := c.Request.URL.Path
	if path != "/" && strings.HasSuffix(path, "/") {
		target := strings.TrimRight(path, "/")
		if c.Request.URL.RawQuery != "" {
			target += "?" + c.Request.URL.RawQuery
		}
		c.Redirect(http.StatusMovedPermanently, target)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	metadata, status := h.metadataForPath(ctx, path)
	if status == http.StatusNotFound {
		metadata.Robots = "noindex, nofollow"
	}
	if status >= http.StatusInternalServerError {
		metadata.Robots = "noindex, nofollow"
	}
	if strings.HasPrefix(path, "/auth") || strings.HasPrefix(path, "/login") || strings.HasPrefix(path, "/panel") {
		metadata.Robots = "noindex, nofollow"
		c.Header("X-Robots-Tag", "noindex, nofollow")
	}

	shell, err := h.loadClientShell(ctx)
	if err != nil {
		c.String(http.StatusBadGateway, "client application is unavailable")
		return
	}
	head := renderSEOHead(metadata)
	page := strings.Replace(string(shell), seoHeadMarker, head, 1)
	if page == string(shell) {
		page = strings.Replace(page, "</head>", head+"\n</head>", 1)
	}
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Data(status, "text/html; charset=utf-8", []byte(page))
}

func (h *Handler) Sitemap(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	baseURL := strings.TrimRight(h.cfg.App.BaseURL, "/")
	urls := []sitemapURL{
		{Loc: baseURL + "/"},
		{Loc: baseURL + "/products"},
		{Loc: baseURL + "/custom-order"},
		{Loc: baseURL + "/courses"},
		{Loc: baseURL + "/guides/choose-fabric-flower"},
		{Loc: baseURL + "/guides/fabric-flower-making-beginners"},
	}

	products, err := h.products.ListProducts(ctx, false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ساخت sitemap محصولات انجام نشد."})
		return
	}
	for _, product := range products {
		urls = append(urls, sitemapURL{Loc: baseURL + "/products/" + url.PathEscape(product.Slug), LastMod: product.UpdatedAt.Format("2006-01-02")})
	}
	courses, err := h.courses.ListCourses(ctx, false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ساخت sitemap دوره‌ها انجام نشد."})
		return
	}
	for _, course := range courses {
		urls = append(urls, sitemapURL{Loc: baseURL + "/courses/" + url.PathEscape(course.Slug), LastMod: course.UpdatedAt.Format("2006-01-02")})
	}

	document := sitemapDocument{Xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9", URLs: urls}
	data, err := xml.MarshalIndent(document, "", "  ")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ساخت sitemap انجام نشد."})
		return
	}
	c.Header("Content-Type", "application/xml; charset=utf-8")
	c.String(http.StatusOK, xml.Header+string(data))
}

func (h *Handler) Robots(c *gin.Context) {
	baseURL := strings.TrimRight(h.cfg.App.BaseURL, "/")
	content := "User-agent: *\nAllow: /\nDisallow: /auth\nDisallow: /login\nDisallow: /panel\nDisallow: /admin\nDisallow: /api/v1/admin/\n\nSitemap: " + baseURL + "/sitemap.xml\n"
	c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(content))
}

func (h *Handler) LLMs(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	baseURL := strings.TrimRight(h.cfg.App.BaseURL, "/")
	products, _ := h.products.ListProducts(ctx, false)
	courses, _ := h.courses.ListCourses(ctx, false)

	var builder strings.Builder
	builder.WriteString("# Golmelo | گلملو\n\n")
	builder.WriteString("> گلملو آتلیه آنلاین گل‌های پارچه‌ای دست‌ساز برای خرید آماده، سفارش اختصاصی و آموزش آنلاین گل‌سازی است.\n\n")
	builder.WriteString("گلملو با بیش از یک دهه تجربه برای خریداران شخصی، خیاط‌ها، مزون‌ها و هنرجویان فعالیت می‌کند. تصاویر کاتالوگ از سفارش‌های واقعی هستند و شخصی‌سازی می‌تواند قیمت پایه را تغییر دهد.\n\n")
	builder.WriteString("## مسیرهای اصلی\n\n")
	builder.WriteString("- [گل‌های آماده](" + baseURL + "/products): کاتالوگ محصولات قابل سفارش\n")
	builder.WriteString("- [سفارش اختصاصی](" + baseURL + "/custom-order): راهنمای انتخاب و ثبت سفارش شخصی‌سازی‌شده\n")
	builder.WriteString("- [دوره‌های آنلاین](" + baseURL + "/courses): آموزش گل‌سازی پارچه‌ای\n")
	builder.WriteString("- [API محصولات](" + baseURL + "/api/v1/products): داده ساختاریافته کاتالوگ عمومی\n")
	builder.WriteString("- [API دوره‌ها](" + baseURL + "/api/v1/courses): داده ساختاریافته دوره‌های عمومی\n\n")
	if len(products) > 0 {
		builder.WriteString("## محصولات\n\n")
		for _, product := range products {
			builder.WriteString(fmt.Sprintf("- [%s](%s/products/%s): %s\n", product.Title, baseURL, url.PathEscape(product.Slug), product.ShortDescription))
		}
		builder.WriteString("\n")
	}
	if len(courses) > 0 {
		builder.WriteString("## دوره‌ها\n\n")
		for _, course := range courses {
			builder.WriteString(fmt.Sprintf("- [%s](%s/courses/%s): %s\n", course.Title, baseURL, url.PathEscape(course.Slug), course.Summary))
		}
	}
	c.Data(http.StatusOK, "text/markdown; charset=utf-8", []byte(builder.String()))
}

func (h *Handler) metadataForPath(ctx context.Context, path string) (siteMetadata, int) {
	baseURL := strings.TrimRight(h.cfg.App.BaseURL, "/")
	defaultImage := baseURL + "/og-image.png"
	meta := siteMetadata{
		Title:       "گلملو | خرید گل پارچه‌ای دست‌ساز و آموزش گل‌سازی",
		Description: "خرید و سفارش اختصاصی گل‌های پارچه‌ای دست‌ساز برای لباس و اکسسوری، همراه با مشاوره تخصصی و دوره‌های آنلاین آموزش گل‌سازی گلملو.",
		Canonical:   baseURL + path,
		Image:       defaultImage,
		PageType:    "website",
		Robots:      "index, follow",
	}

	switch {
	case path == "/":
		meta.Canonical = baseURL + "/"
		meta.PreloadImage, meta.PreloadSources = h.firstHeroImage(ctx)
		meta.JSONLD = []any{organizationGraph(baseURL, meta.Description)}
		return meta, http.StatusOK
	case path == "/products":
		meta.Title = "محصولات گلملو | گل‌های پارچه‌ای دست‌ساز"
		meta.Description = "مشاهده گل‌های پارچه‌ای دست‌ساز گلملو برای لباس و اکسسوری با قیمت پایه، موجودی و امکان سفارش اختصاصی."
		meta.JSONLD = []any{breadcrumb(baseURL, []crumb{{"گلملو", "/"}, {"محصولات", "/products"}})}
		return meta, http.StatusOK
	case strings.HasPrefix(path, "/products/"):
		slug := strings.TrimPrefix(path, "/products/")
		product, err := h.products.GetProduct(ctx, slug, false)
		if errors.Is(err, repository.ErrNotFound) || slug == "" {
			return notFoundMetadata(baseURL, defaultImage), http.StatusNotFound
		}
		if err != nil {
			return serverErrorMetadata(baseURL, defaultImage), http.StatusInternalServerError
		}
		h.attachProductImage(ctx, &product)
		meta.Title = firstNonEmpty(product.SEOTitle, product.Title+" | گلملو")
		meta.Description = firstNonEmpty(product.SEODescription, product.ShortDescription, product.Description)
		meta.Canonical = baseURL + "/products/" + url.PathEscape(product.Slug)
		meta.Image = firstNonEmpty(product.CoverImageURL, defaultImage)
		meta.PageType = "product"
		meta.JSONLD = []any{productSchema(baseURL, product), breadcrumb(baseURL, []crumb{{"گلملو", "/"}, {"محصولات", "/products"}, {product.Title, "/products/" + product.Slug}})}
		return meta, http.StatusOK
	case path == "/courses":
		meta.Title = "دوره‌های آنلاین گلملو | آموزش گل‌سازی پارچه‌ای"
		meta.Description = "دوره‌های آنلاین گل‌سازی پارچه‌ای گلملو، از سطح مبتدی تا حرفه‌ای، با آموزش مرحله‌به‌مرحله و دسترسی از پنل هنرجو."
		meta.JSONLD = []any{breadcrumb(baseURL, []crumb{{"گلملو", "/"}, {"دوره‌ها", "/courses"}})}
		return meta, http.StatusOK
	case strings.HasPrefix(path, "/courses/"):
		slug := strings.TrimPrefix(path, "/courses/")
		course, err := h.courses.GetCourse(ctx, slug, false)
		if errors.Is(err, repository.ErrNotFound) || slug == "" {
			return notFoundMetadata(baseURL, defaultImage), http.StatusNotFound
		}
		if err != nil {
			return serverErrorMetadata(baseURL, defaultImage), http.StatusInternalServerError
		}
		images, _ := h.courseImagesWithURLs(ctx, course.ID)
		h.attachCourseImageURL(&course, images)
		meta.Title = course.Title + " | دوره آنلاین گلملو"
		meta.Description = firstNonEmpty(course.Summary, course.Description)
		meta.Canonical = baseURL + "/courses/" + url.PathEscape(course.Slug)
		meta.Image = firstNonEmpty(course.ImageURL, defaultImage)
		meta.PageType = "article"
		meta.JSONLD = []any{courseSchema(baseURL, course), breadcrumb(baseURL, []crumb{{"گلملو", "/"}, {"دوره‌ها", "/courses"}, {course.Title, "/courses/" + course.Slug}})}
		return meta, http.StatusOK
	case path == "/custom-order":
		meta.Title = "سفارش گل پارچه‌ای اختصاصی | گلملو"
		meta.Description = "راهنمای سفارش گل پارچه‌ای اختصاصی متناسب با لباس، رنگ، اندازه، کاربرد و بودجه همراه با مشاوره پیش از سفارش گلملو."
		meta.JSONLD = []any{
			articleSchema(baseURL, path, meta.Title, meta.Description),
			faqSchema([]faqItem{
				{"آیا قیمت نهایی با قیمت پایه فرق می‌کند؟", "بله. تغییر اندازه، جنس، تعداد و جزئیات شخصی‌سازی می‌تواند قیمت نهایی را تغییر دهد و مبلغ پس از بررسی اعلام می‌شود."},
				{"آیا می‌توانم عکس لباس را ارسال کنم؟", "بله. در فرم سفارش می‌توانید تصاویر مرجع لباس، رنگ یا مدل مشابه را اضافه کنید."},
			}),
			breadcrumb(baseURL, []crumb{{"گلملو", "/"}, {"سفارش اختصاصی", path}}),
		}
		return meta, http.StatusOK
	case path == "/guides/choose-fabric-flower":
		meta.Title = "راهنمای انتخاب گل پارچه‌ای برای لباس | گلملو"
		meta.Description = "چطور گل پارچه‌ای مناسب مانتو، کت و لباس مجلسی را بر اساس رنگ، اندازه، محل اتصال و فرم لباس انتخاب کنیم."
		meta.PageType = "article"
		meta.JSONLD = []any{
			articleSchema(baseURL, path, meta.Title, meta.Description),
			faqSchema([]faqItem{
				{"برای لباس طرح‌دار چه گلی مناسب است؟", "معمولاً فرم ساده‌تر و رنگی برگرفته از یکی از رنگ‌های فرعی لباس، ظاهر منسجم‌تری ایجاد می‌کند."},
				{"اگر مدل مناسب را ندانم چه کنم؟", "از کاتالوگ برای ایده‌گرفتن استفاده کنید و سپس عکس لباس و کاربرد را در سفارش اختصاصی بفرستید تا پیش از ثبت نهایی مشاوره بگیرید."},
			}),
			breadcrumb(baseURL, []crumb{{"گلملو", "/"}, {"راهنمای انتخاب گل", path}}),
		}
		return meta, http.StatusOK
	case path == "/guides/fabric-flower-making-beginners":
		meta.Title = "شروع گل‌سازی پارچه‌ای برای مبتدیان | گلملو"
		meta.Description = "راهنمای ابزار، پارچه و مسیر شروع یادگیری گل‌سازی پارچه‌ای برای هنرجویان مبتدی."
		meta.PageType = "article"
		meta.JSONLD = []any{
			articleSchema(baseURL, path, meta.Title, meta.Description),
			faqSchema([]faqItem{
				{"آیا برای شروع باید خیاطی بلد باشم؟", "خیر. آشنایی پایه با نخ و سوزن کمک‌کننده است اما مسیر مقدماتی می‌تواند از سطح مبتدی آغاز شود."},
				{"از کدام دوره شروع کنم؟", "سطح، پیش‌نیاز و سرفصل هر دوره در صفحه جزئیات آن نوشته شده است؛ دوره مقدماتی برای شروع مرحله‌به‌مرحله مناسب‌تر است."},
			}),
			breadcrumb(baseURL, []crumb{{"گلملو", "/"}, {"شروع گل‌سازی", path}}),
		}
		return meta, http.StatusOK
	case path == "/privacy":
		meta.Title = "حریم خصوصی | گلملو"
		meta.Description = "نحوه جمع‌آوری و استفاده از اطلاعات فرم‌ها، حساب کاربری و داده‌های آماری در وب‌سایت گلملو."
		meta.JSONLD = []any{breadcrumb(baseURL, []crumb{{"گلملو", "/"}, {"حریم خصوصی", path}})}
		return meta, http.StatusOK
	case path == "/auth" || path == "/login" || path == "/panel" || strings.HasPrefix(path, "/panel/"):
		meta.Title = "حساب کاربری | گلملو"
		meta.Description = "ورود به حساب و پنل مشتری گلملو."
		meta.Robots = "noindex, nofollow"
		return meta, http.StatusOK
	default:
		return notFoundMetadata(baseURL, defaultImage), http.StatusNotFound
	}
}

func (h *Handler) loadClientShell(ctx context.Context) ([]byte, error) {
	h.siteShellMu.RLock()
	if len(h.siteShell) > 0 && time.Since(h.siteShellAt) < 30*time.Second {
		cached := append([]byte(nil), h.siteShell...)
		h.siteShellMu.RUnlock()
		return cached, nil
	}
	h.siteShellMu.RUnlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, h.cfg.App.ClientOrigin+"/index.html", nil)
	if err != nil {
		return nil, err
	}
	response, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("client shell returned %s", response.Status)
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, 2<<20))
	if err != nil {
		return nil, err
	}
	h.siteShellMu.Lock()
	h.siteShell = append([]byte(nil), data...)
	h.siteShellAt = time.Now()
	h.siteShellMu.Unlock()
	return data, nil
}

func (h *Handler) firstHeroImage(ctx context.Context) (string, []models.ImageSource) {
	var id string
	if err := h.db.Pool().QueryRow(ctx, `SELECT id FROM hero_slides ORDER BY sort_order ASC, filename ASC LIMIT 1`).Scan(&id); err != nil {
		return "", nil
	}
	return h.heroSlideURL(id), h.imageSources(ctx, heroSlidesTable, id)
}

func renderSEOHead(meta siteMetadata) string {
	values := []string{
		"<title>" + html.EscapeString(meta.Title) + "</title>",
		metaTag("name", "description", meta.Description),
		metaTag("name", "robots", meta.Robots),
		`<link rel="canonical" href="` + html.EscapeString(meta.Canonical) + `" />`,
		metaTag("property", "og:locale", "fa_IR"),
		metaTag("property", "og:type", meta.PageType),
		metaTag("property", "og:site_name", "golmelo"),
		metaTag("property", "og:title", meta.Title),
		metaTag("property", "og:description", meta.Description),
		metaTag("property", "og:url", meta.Canonical),
		metaTag("property", "og:image", meta.Image),
		metaTag("name", "twitter:card", "summary_large_image"),
		metaTag("name", "twitter:title", meta.Title),
		metaTag("name", "twitter:description", meta.Description),
		metaTag("name", "twitter:image", meta.Image),
	}
	if meta.PreloadImage != "" {
		preload := `<link rel="preload" as="image" href="` + html.EscapeString(meta.PreloadImage) + `" fetchpriority="high"`
		if srcSet := imageSourceSet(meta.PreloadSources); srcSet != "" {
			preload += ` imagesrcset="` + html.EscapeString(srcSet) + `" imagesizes="100vw" type="image/webp"`
		}
		values = append(values, preload+` />`)
	}
	for _, item := range meta.JSONLD {
		data, err := json.Marshal(item)
		if err == nil {
			id := jsonLDScriptID(item)
			idAttribute := ""
			if id != "" {
				idAttribute = ` id="` + id + `"`
			}
			values = append(values, `<script`+idAttribute+` data-seo-shell="true" type="application/ld+json">`+string(data)+`</script>`)
		}
	}
	return strings.Join(values, "\n    ")
}

func jsonLDScriptID(item any) string {
	value, ok := item.(map[string]any)
	if !ok {
		return ""
	}
	if _, ok := value["@graph"]; ok {
		return "golmelo-website-jsonld"
	}
	switch value["@type"] {
	case "Product":
		return "golmelo-product-jsonld"
	case "Course":
		return "golmelo-course-jsonld"
	case "Article":
		return "golmelo-article-jsonld"
	case "FAQPage":
		return "golmelo-faq-jsonld"
	case "BreadcrumbList":
		return "golmelo-breadcrumb-jsonld"
	default:
		return ""
	}
}

func imageSourceSet(sources []models.ImageSource) string {
	values := make([]string, 0, len(sources))
	for _, source := range sources {
		if source.URL == "" || source.Width <= 0 || source.Type != "image/webp" {
			continue
		}
		values = append(values, fmt.Sprintf("%s %dw", source.URL, source.Width))
	}
	return strings.Join(values, ", ")
}

func metaTag(attribute, key, value string) string {
	return `<meta ` + attribute + `="` + html.EscapeString(key) + `" content="` + html.EscapeString(value) + `" />`
}

type crumb struct {
	Name string
	Path string
}

func breadcrumb(baseURL string, crumbs []crumb) map[string]any {
	items := make([]map[string]any, 0, len(crumbs))
	for index, item := range crumbs {
		items = append(items, map[string]any{"@type": "ListItem", "position": index + 1, "name": item.Name, "item": strings.TrimRight(baseURL, "/") + item.Path})
	}
	return map[string]any{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items}
}

func organizationGraph(baseURL, description string) map[string]any {
	return map[string]any{"@context": "https://schema.org", "@graph": []any{
		map[string]any{"@type": "Organization", "@id": baseURL + "/#organization", "name": "گلملو", "alternateName": "golmelo", "url": baseURL + "/", "logo": baseURL + "/logo.png", "description": description},
		map[string]any{"@type": "WebSite", "@id": baseURL + "/#website", "name": "golmelo", "alternateName": "گلملو", "url": baseURL + "/", "inLanguage": "fa-IR", "publisher": map[string]any{"@id": baseURL + "/#organization"}},
	}}
}

type faqItem struct {
	Question string
	Answer   string
}

func articleSchema(baseURL, path, title, description string) map[string]any {
	pageURL := strings.TrimRight(baseURL, "/") + path
	return map[string]any{
		"@context": "https://schema.org", "@type": "Article", "@id": pageURL + "#article",
		"headline": title, "description": description, "url": pageURL, "inLanguage": "fa-IR",
		"publisher": map[string]any{"@type": "Organization", "@id": strings.TrimRight(baseURL, "/") + "/#organization", "name": "گلملو"},
	}
}

func faqSchema(items []faqItem) map[string]any {
	questions := make([]map[string]any, 0, len(items))
	for _, item := range items {
		questions = append(questions, map[string]any{
			"@type": "Question", "name": item.Question,
			"acceptedAnswer": map[string]any{"@type": "Answer", "text": item.Answer},
		})
	}
	return map[string]any{"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": questions}
}

func productSchema(baseURL string, product models.Product) map[string]any {
	productURL := baseURL + "/products/" + url.PathEscape(product.Slug)
	schema := map[string]any{
		"@context": "https://schema.org", "@type": "Product", "@id": productURL + "#product", "name": product.Title,
		"description": firstNonEmpty(product.Description, product.ShortDescription),
		"url":         productURL, "category": product.Category,
		"brand": map[string]any{"@type": "Brand", "name": "گلملو"},
	}
	if product.CoverImageURL != "" {
		schema["image"] = []string{product.CoverImageURL}
	}
	if product.BasePriceRial > 0 {
		schema["offers"] = map[string]any{
			"@type": "Offer", "@id": productURL + "#offer", "price": product.BasePriceRial, "priceCurrency": firstNonEmpty(product.PriceCurrency, "IRR"),
			"availability": schemaAvailability(product.Availability), "url": schema["url"],
		}
	}
	return schema
}

func courseSchema(baseURL string, course models.Course) map[string]any {
	courseURL := baseURL + "/courses/" + url.PathEscape(course.Slug)
	schema := map[string]any{
		"@context": "https://schema.org", "@type": "Course", "@id": courseURL + "#course", "name": course.Title,
		"description": firstNonEmpty(course.Description, course.Summary), "url": courseURL,
		"provider": map[string]any{"@type": "Organization", "name": "گلملو", "sameAs": baseURL + "/"},
	}
	if course.ImageURL != "" {
		schema["image"] = course.ImageURL
	}
	if course.BasePriceRial > 0 && course.Status == "for_sale" {
		schema["offers"] = map[string]any{"@type": "Offer", "price": course.BasePriceRial, "priceCurrency": firstNonEmpty(course.PriceCurrency, "IRR"), "availability": "https://schema.org/InStock", "url": schema["url"]}
	}
	return schema
}

func schemaAvailability(value string) string {
	switch value {
	case repository.ProductAvailabilityOutOfStock:
		return "https://schema.org/OutOfStock"
	case repository.ProductAvailabilityMadeToOrder:
		return "https://schema.org/PreOrder"
	default:
		return "https://schema.org/InStock"
	}
}

func notFoundMetadata(baseURL, image string) siteMetadata {
	return siteMetadata{Title: "صفحه پیدا نشد | گلملو", Description: "صفحه موردنظر در گلملو پیدا نشد.", Canonical: baseURL + "/not-found", Image: image, PageType: "website", Robots: "noindex, nofollow"}
}

func serverErrorMetadata(baseURL, image string) siteMetadata {
	return siteMetadata{Title: "خطای موقت | گلملو", Description: "دریافت محتوای این صفحه موقتاً انجام نشد.", Canonical: baseURL + "/", Image: image, PageType: "website", Robots: "noindex, nofollow"}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
