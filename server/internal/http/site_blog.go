package httpapi

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"melody-server/internal/models"
	"melody-server/internal/repository"

	"github.com/gin-gonic/gin"
)

type blogBootstrap struct {
	Type string           `json:"type"`
	List *models.BlogList `json:"list,omitempty"`
	Post *models.BlogPost `json:"post,omitempty"`
}

type rssDocument struct {
	XMLName xml.Name   `xml:"rss"`
	Version string     `xml:"version,attr"`
	Channel rssChannel `xml:"channel"`
}

type rssChannel struct {
	Title       string    `xml:"title"`
	Link        string    `xml:"link"`
	Description string    `xml:"description"`
	Language    string    `xml:"language"`
	Items       []rssItem `xml:"item"`
}

type rssItem struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	GUID        string `xml:"guid"`
	Description string `xml:"description"`
	PubDate     string `xml:"pubDate,omitempty"`
}

func (h *Handler) blogSitePage(ctx context.Context, path string) (string, string, string, siteMetadata, int, bool) {
	if path != "/blogs" && !strings.HasPrefix(path, "/blogs/") {
		return "", "", "", siteMetadata{}, 0, false
	}
	baseURL := strings.TrimRight(h.cfg.App.BaseURL, "/")
	defaultImage := baseURL + "/og-image.png"
	meta := siteMetadata{Title: "مقالات گلملو | راهنمای گل‌های پارچه‌ای", Description: "مقاله‌ها و راهنماهای فارسی گلملو درباره انتخاب، سفارش و ساخت گل‌های پارچه‌ای دست‌ساز.", Canonical: baseURL + path, Image: defaultImage, PageType: "website", Robots: "index, follow"}

	if path == "/blogs" || strings.HasPrefix(path, "/blogs/page/") {
		page := 1
		if path != "/blogs" {
			raw := strings.TrimPrefix(path, "/blogs/page/")
			parsed, err := strconv.Atoi(raw)
			if err != nil || parsed < 1 || strconv.Itoa(parsed) != raw {
				return renderBlogStatus("صفحه مقالات پیدا نشد", "شماره صفحه معتبر نیست."), "", "", notFoundMetadata(baseURL, defaultImage), http.StatusNotFound, true
			}
			if parsed == 1 {
				return "", "", "/blogs", meta, http.StatusMovedPermanently, true
			}
			page = parsed
		}
		list, err := h.blogs.ListPublic(ctx, page, 9)
		if err != nil {
			return renderBlogStatus("خطا در دریافت مقالات", "لطفاً دوباره تلاش کنید."), "", "", serverErrorMetadata(baseURL, defaultImage), http.StatusInternalServerError, true
		}
		if page > 1 && (list.TotalPages == 0 || page > list.TotalPages) {
			return renderBlogStatus("صفحه مقالات پیدا نشد", "این شماره صفحه وجود ندارد."), "", "", notFoundMetadata(baseURL, defaultImage), http.StatusNotFound, true
		}
		h.attachBlogSummaryImages(ctx, list.Posts)
		meta.Canonical = baseURL + "/blogs"
		if page > 1 {
			meta.Title = fmt.Sprintf("مقالات گلملو - صفحه %s", persianDigits(strconv.Itoa(page)))
			meta.Canonical = fmt.Sprintf("%s/blogs/page/%d", baseURL, page)
		}
		meta.JSONLD = []any{blogListSchema(baseURL, list), breadcrumb(baseURL, []crumb{{"گلملو", "/"}, {"مقالات", "/blogs"}})}
		bootstrap, _ := safeBootstrapJSON(blogBootstrap{Type: "list", List: &list})
		return renderBlogList(list), bootstrap, "", meta, http.StatusOK, true
	}

	slug := strings.TrimPrefix(path, "/blogs/")
	if slug == "" || strings.Contains(slug, "/") {
		return renderBlogStatus("مقاله پیدا نشد", "نشانی مقاله معتبر نیست."), "", "", notFoundMetadata(baseURL, defaultImage), http.StatusNotFound, true
	}
	post, redirected, err := h.blogs.GetPublic(ctx, slug)
	if errors.Is(err, repository.ErrBlogGone) {
		meta = notFoundMetadata(baseURL, defaultImage)
		meta.Title = "مقاله آرشیو شده است | گلملو"
		meta.Robots = "noindex, follow"
		return renderBlogStatus("این مقاله آرشیو شده است", "برای مطالعه مطالب تازه به فهرست مقالات برگردید."), "", "", meta, http.StatusGone, true
	}
	if errors.Is(err, repository.ErrNotFound) {
		return renderBlogStatus("مقاله پیدا نشد", "ممکن است نشانی مقاله تغییر کرده باشد."), "", "", notFoundMetadata(baseURL, defaultImage), http.StatusNotFound, true
	}
	if err != nil {
		return renderBlogStatus("خطا در دریافت مقاله", "لطفاً دوباره تلاش کنید."), "", "", serverErrorMetadata(baseURL, defaultImage), http.StatusInternalServerError, true
	}
	if redirected {
		return "", "", "/blogs/" + url.PathEscape(post.Slug), meta, http.StatusMovedPermanently, true
	}
	h.prepareBlogPost(ctx, &post)
	post.BodyHTMLSource = ""
	meta.Title = firstNonEmpty(post.SEOTitle, post.Title+" | گلملو")
	meta.Description = firstNonEmpty(post.SEODescription, post.Excerpt)
	meta.Canonical = baseURL + "/blogs/" + url.PathEscape(post.Slug)
	meta.Image = firstNonEmpty(post.OGImageURL, post.CoverImageURL, defaultImage)
	meta.PageType = "article"
	meta.JSONLD = []any{blogPostingSchema(baseURL, post), breadcrumb(baseURL, []crumb{{"گلملو", "/"}, {"مقالات", "/blogs"}, {post.Title, "/blogs/" + post.Slug}})}
	if len(post.FAQItems) > 0 {
		items := make([]faqItem, 0, len(post.FAQItems))
		for _, item := range post.FAQItems {
			items = append(items, faqItem{item.Question, item.Answer})
		}
		meta.JSONLD = append(meta.JSONLD, faqSchema(items))
	}
	bootstrap, _ := safeBootstrapJSON(blogBootstrap{Type: "detail", Post: &post})
	return renderBlogPost(post), bootstrap, "", meta, http.StatusOK, true
}

func (h *Handler) BlogFeed(c *gin.Context) {
	c.Header("Cache-Control", "no-cache, max-age=0, must-revalidate")
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()
	list, err := h.blogs.ListPublic(ctx, 1, 50)
	if err != nil {
		c.String(http.StatusInternalServerError, "feed unavailable")
		return
	}
	baseURL := strings.TrimRight(h.cfg.App.BaseURL, "/")
	items := make([]rssItem, 0, len(list.Posts))
	for _, post := range list.Posts {
		link := baseURL + "/blogs/" + url.PathEscape(post.Slug)
		published := ""
		if post.PublishedAt != nil {
			published = post.PublishedAt.Format(time.RFC1123Z)
		} else if post.ScheduledFor != nil {
			published = post.ScheduledFor.Format(time.RFC1123Z)
		}
		items = append(items, rssItem{Title: post.Title, Link: link, GUID: link, Description: post.Excerpt, PubDate: published})
	}
	document := rssDocument{Version: "2.0", Channel: rssChannel{Title: "مقالات گلملو", Link: baseURL + "/blogs", Description: "راهنماهای فارسی گل‌های پارچه‌ای گلملو", Language: "fa-IR", Items: items}}
	data, err := xml.MarshalIndent(document, "", "  ")
	if err != nil {
		c.String(http.StatusInternalServerError, "feed unavailable")
		return
	}
	c.Data(http.StatusOK, "application/rss+xml; charset=utf-8", append([]byte(xml.Header), data...))
}

func renderBlogList(list models.BlogList) string {
	var builder strings.Builder
	builder.WriteString(`<main dir="rtl" class="min-h-screen bg-[#f5f1eb] pt-28 text-[#493d37]"><section class="mx-auto max-w-6xl px-4 pb-20 md:px-8"><header class="mb-10 text-center"><h1 class="text-3xl font-semibold md:text-5xl">مقالات گلملو</h1><p class="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#6f625b] md:text-base">راهنماها و تجربه‌های گلملو برای انتخاب، سفارش و ساخت گل‌های پارچه‌ای دست‌ساز.</p></header>`)
	if len(list.Posts) == 0 {
		builder.WriteString(`<p class="py-16 text-center text-[#6f625b]">هنوز مقاله‌ای منتشر نشده است.</p>`)
	} else {
		builder.WriteString(`<div class="grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">`)
		for _, post := range list.Posts {
			builder.WriteString(renderBlogCard(post))
		}
		builder.WriteString(`</div>`)
	}
	builder.WriteString(renderBlogPagination(list))
	builder.WriteString(`</section></main>`)
	return builder.String()
}

func renderBlogCard(post models.BlogPostSummary) string {
	date := effectiveBlogDate(post.PublishedAt, post.ScheduledFor)
	var builder strings.Builder
	builder.WriteString(`<article><a href="/blogs/` + html.EscapeString(post.Slug) + `" class="group block">`)
	if post.CoverImageURL != "" {
		builder.WriteString(`<div class="aspect-[4/3] overflow-hidden rounded-md bg-[#f3eeea]">` + renderSSRBlogImage(post.CoverImageURL, post.CoverImageSources, post.CoverImageAlt, "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw", "960", "720", true, `h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]`) + `</div>`)
	}
	builder.WriteString(`<div class="pt-4"><p class="text-xs text-[#8a7770]">` + html.EscapeString(formatPersianDate(date)) + ` · ` + persianDigits(strconv.Itoa(post.ReadingTimeMinutes)) + ` دقیقه مطالعه</p><h2 class="mt-2 text-lg font-semibold leading-8 text-[#342c28]">` + html.EscapeString(post.Title) + `</h2><p class="mt-2 line-clamp-3 text-sm leading-7 text-[#6f625b]">` + html.EscapeString(post.Excerpt) + `</p><span class="mt-3 inline-block text-sm font-medium text-[#a05f62]">مطالعه مقاله</span></div></a></article>`)
	return builder.String()
}

func renderBlogPost(post models.BlogPost) string {
	var builder strings.Builder
	builder.WriteString(`<main dir="rtl" class="min-h-screen bg-[#f5f1eb] pt-28 text-[#493d37]"><article class="mx-auto max-w-4xl px-4 pb-20 md:px-8"><nav aria-label="مسیر صفحه" class="mb-7 text-sm text-[#807269]"><a href="/">گلملو</a><span class="px-2">/</span><a href="/blogs">مقالات</a></nav><header class="text-center"><h1 class="text-3xl font-semibold leading-tight md:text-5xl">` + html.EscapeString(post.Title) + `</h1><p class="mx-auto mt-5 max-w-3xl text-base leading-8 text-[#6f625b]">` + html.EscapeString(post.Excerpt) + `</p><p class="mt-4 text-xs text-[#8a7770]">` + html.EscapeString(post.AuthorName) + ` · ` + html.EscapeString(formatPersianDate(effectiveBlogDate(post.PublishedAt, post.ScheduledFor))) + ` · ` + persianDigits(strconv.Itoa(post.ReadingTimeMinutes)) + ` دقیقه مطالعه</p>`)
	if post.ReviewerName != "" {
		builder.WriteString(`<p class="mt-2 text-xs text-[#8a7770]">بازبینی: ` + html.EscapeString(post.ReviewerName) + `</p>`)
	}
	if published := effectiveBlogDate(post.PublishedAt, post.ScheduledFor); published != nil && post.UpdatedAt.Sub(*published) > 24*time.Hour {
		builder.WriteString(`<p class="mt-2 text-xs text-[#8a7770]">آخرین ویرایش: ` + html.EscapeString(formatPersianDate(&post.UpdatedAt)) + `</p>`)
	}
	builder.WriteString(`</header>`)
	if post.CoverImageURL != "" {
		builder.WriteString(`<figure class="my-10 overflow-hidden rounded-md">` + renderSSRBlogImage(post.CoverImageURL, post.CoverImageSources, post.CoverImageAlt, "(min-width: 896px) 832px, 100vw", "1200", "900", false, `aspect-[4/3] w-full object-cover`) + `</figure>`)
	}
	if len(post.TableOfContents) > 0 {
		builder.WriteString(`<nav aria-label="فهرست مطالب" class="blog-toc my-10 border-y border-[#eadfda] py-6"><h2 class="mb-3 text-base font-semibold">فهرست مطالب</h2><ol class="space-y-2 text-sm text-[#6f625b]">`)
		for _, item := range post.TableOfContents {
			builder.WriteString(`<li><a href="#` + html.EscapeString(item.ID) + `">` + html.EscapeString(item.Title) + `</a></li>`)
		}
		builder.WriteString(`</ol></nav>`)
	}
	builder.WriteString(`<div class="blog-content">` + post.BodyHTML + `</div>`)
	if len(post.FAQItems) > 0 {
		builder.WriteString(`<section class="mt-14"><h2 class="mb-6 text-2xl font-semibold">سؤال‌های متداول</h2><div class="divide-y divide-[#eadfda] border-y border-[#eadfda]">`)
		for _, faq := range post.FAQItems {
			builder.WriteString(`<details class="py-5"><summary class="cursor-pointer font-medium">` + html.EscapeString(faq.Question) + `</summary><p class="mt-3 text-sm leading-7 text-[#6f625b]">` + html.EscapeString(faq.Answer) + `</p></details>`)
		}
		builder.WriteString(`</div></section>`)
	}
	if post.CTALabel != "" && post.CTAURL != "" {
		builder.WriteString(`<aside class="mt-14 bg-[#f6eeee] px-5 py-8 text-center"><p class="mx-auto max-w-xl text-sm leading-7 text-[#5f514c]">` + html.EscapeString(post.CTAText) + `</p><a href="` + html.EscapeString(post.CTAURL) + `" class="mt-5 inline-flex h-11 items-center bg-[#a05f62] px-6 text-sm font-medium text-white">` + html.EscapeString(post.CTALabel) + `</a></aside>`)
	}
	if len(post.RelatedPosts) > 0 {
		builder.WriteString(`<section class="mt-16"><h2 class="mb-7 text-center text-2xl font-semibold">مقالات مرتبط</h2><div class="grid gap-6 md:grid-cols-3">`)
		for _, related := range post.RelatedPosts {
			builder.WriteString(renderBlogCard(related))
		}
		builder.WriteString(`</div></section>`)
	}
	builder.WriteString(`</article></main>`)
	return builder.String()
}

func renderBlogPagination(list models.BlogList) string {
	if list.TotalPages <= 1 {
		return ""
	}
	var builder strings.Builder
	builder.WriteString(`<nav aria-label="صفحه‌بندی مقالات" class="mt-14 flex justify-center gap-2">`)
	for page := 1; page <= list.TotalPages; page++ {
		href := "/blogs"
		if page > 1 {
			href = fmt.Sprintf("/blogs/page/%d", page)
		}
		current := ""
		if page == list.Page {
			current = ` aria-current="page" class="grid h-10 w-10 place-items-center bg-[#a05f62] text-white"`
		} else {
			current = ` class="grid h-10 w-10 place-items-center border border-[#decfca] text-[#5f514c]"`
		}
		builder.WriteString(`<a href="` + href + `"` + current + `>` + persianDigits(strconv.Itoa(page)) + `</a>`)
	}
	builder.WriteString(`</nav>`)
	return builder.String()
}

func renderBlogStatus(title, message string) string {
	return `<main dir="rtl" class="grid min-h-screen place-items-center bg-[#f5f1eb] px-4 text-center text-[#493d37]"><div><h1 class="text-3xl font-semibold">` + html.EscapeString(title) + `</h1><p class="mt-4 text-[#6f625b]">` + html.EscapeString(message) + `</p><a href="/blogs" class="mt-7 inline-flex h-11 items-center bg-[#a05f62] px-6 text-sm text-white">بازگشت به مقالات</a></div></main>`
}

func renderSSRBlogImage(src string, sources []models.ImageSource, alt, sizes, width, height string, lazy bool, className string) string {
	items := make([]string, 0, len(sources))
	for _, source := range sources {
		if source.URL != "" && source.Width > 0 && source.Type == "image/webp" {
			items = append(items, fmt.Sprintf("%s %dw", source.URL, source.Width))
		}
	}
	loading := ""
	priority := ""
	if lazy {
		loading = ` loading="lazy"`
	} else {
		priority = ` fetchpriority="high"`
	}
	srcset := ""
	if len(items) > 0 {
		srcset = ` srcset="` + html.EscapeString(strings.Join(items, ", ")) + `" sizes="` + html.EscapeString(sizes) + `"`
	}
	return `<img src="` + html.EscapeString(src) + `"` + srcset + ` alt="` + html.EscapeString(alt) + `" width="` + width + `" height="` + height + `" decoding="async"` + loading + priority + ` class="` + className + `">`
}

func safeBootstrapJSON(value any) (string, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	return strings.ReplaceAll(string(data), "<", "\\u003c"), nil
}

func blogListSchema(baseURL string, list models.BlogList) map[string]any {
	posts := make([]map[string]any, 0, len(list.Posts))
	for _, post := range list.Posts {
		posts = append(posts, map[string]any{"@type": "BlogPosting", "headline": post.Title, "url": baseURL + "/blogs/" + post.Slug})
	}
	return map[string]any{"@context": "https://schema.org", "@type": "Blog", "name": "مقالات گلملو", "url": baseURL + "/blogs", "blogPost": posts, "inLanguage": "fa-IR"}
}

func blogPostingSchema(baseURL string, post models.BlogPost) map[string]any {
	result := map[string]any{"@context": "https://schema.org", "@type": "BlogPosting", "headline": post.Title, "description": post.Excerpt, "mainEntityOfPage": baseURL + "/blogs/" + post.Slug, "inLanguage": "fa-IR", "author": map[string]any{"@type": "Organization", "name": post.AuthorName}, "publisher": map[string]any{"@type": "Organization", "name": "گلملو", "url": baseURL}, "dateModified": post.UpdatedAt.Format(time.RFC3339)}
	if post.PublishedAt != nil {
		result["datePublished"] = post.PublishedAt.Format(time.RFC3339)
	} else if post.ScheduledFor != nil {
		result["datePublished"] = post.ScheduledFor.Format(time.RFC3339)
	}
	if post.CoverImageURL != "" {
		result["image"] = post.CoverImageURL
	}
	if post.ReviewerName != "" {
		result["reviewedBy"] = map[string]any{"@type": "Person", "name": post.ReviewerName}
	}
	return result
}

func effectiveBlogDate(published, scheduled *time.Time) *time.Time {
	if published != nil {
		return published
	}
	return scheduled
}

func formatPersianDate(value *time.Time) string {
	if value == nil {
		return ""
	}
	year, month, day := gregorianToJalali(value.In(time.FixedZone("Asia/Tehran", 3*60*60+30*60)).Date())
	months := []string{"فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"}
	return fmt.Sprintf("%s %s %s", persianDigits(strconv.Itoa(day)), months[month-1], persianDigits(strconv.Itoa(year)))
}

func gregorianToJalali(gy int, gm time.Month, gd int) (int, int, int) {
	gdm := []int{0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334}
	y := gy
	if gm > 2 {
		y++
	}
	days := 355666 + 365*gy + (y+3)/4 - (y+99)/100 + (y+399)/400 + gd + gdm[int(gm)-1]
	jy := -1595 + 33*(days/12053)
	days %= 12053
	jy += 4 * (days / 1461)
	days %= 1461
	if days > 365 {
		jy += (days - 1) / 365
		days = (days - 1) % 365
	}
	if days < 186 {
		return jy, 1 + days/31, 1 + days%31
	}
	return jy, 7 + (days-186)/30, 1 + (days-186)%30
}

func persianDigits(value string) string {
	replacer := strings.NewReplacer("0", "۰", "1", "۱", "2", "۲", "3", "۳", "4", "۴", "5", "۵", "6", "۶", "7", "۷", "8", "۸", "9", "۹")
	return replacer.Replace(value)
}
