package httpapi

import (
	"context"
	"crypto/subtle"
	"net/http"
	"strings"
	"time"

	"melody-server/internal/config"
	"melody-server/internal/database"

	"github.com/gin-gonic/gin"
)

func NewRouter(db *database.PostgresDB, cfg *config.Config) *gin.Engine {
	if cfg.App.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.RedirectTrailingSlash = false
	router.RedirectFixedPath = false
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(corsMiddleware(cfg.App.AllowedOrigins))

	handler := NewHandler(db, cfg)

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "melody-api",
		})
	})
	router.GET("/health/ready", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()
		if err := db.VerifyBlogSchema(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready", "service": "melody-api"})
	})
	router.GET("/sitemap.xml", handler.Sitemap)
	router.GET("/robots.txt", handler.Robots)
	router.GET("/llms.txt", handler.LLMs)
	router.GET("/blogs/feed.xml", handler.BlogFeed)
	router.GET("/llm.txt", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/llms.txt")
	})

	v1 := router.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/signup", handler.Signup)
			auth.POST("/login", handler.Login)
			auth.POST("/refresh", handler.Refresh)

			protected := auth.Group("")
			protected.Use(userAuthMiddleware(cfg.Auth))
			{
				protected.POST("/logout", handler.Logout)
			}
		}

		v1.GET("/session", handler.Session)
		userProtected := v1.Group("")
		userProtected.Use(userAuthMiddleware(cfg.Auth))
		{
			userProtected.GET("/me", handler.GetMe)
			userProtected.PUT("/me", handler.UpdateMe)
			userProtected.GET("/me/course-accesses", handler.ListMyCourseAccesses)
			userProtected.GET("/me/course-signups", handler.ListMyCourseSignups)
			userProtected.POST("/course-signups", handler.CreateCourseSignup)
			userProtected.GET("/me/addresses", handler.ListAddresses)
			userProtected.POST("/me/addresses", handler.CreateAddress)
			userProtected.PATCH("/me/addresses/:id", handler.UpdateAddress)
			userProtected.DELETE("/me/addresses/:id", handler.DeleteAddress)
			userProtected.PATCH("/me/addresses/:id/default", handler.SetDefaultAddress)
			userProtected.GET("/orders", handler.ListOrders)
			userProtected.POST("/orders", handler.CreateOrder)
			userProtected.PATCH("/orders/:id", handler.UpdateOrder)
			userProtected.DELETE("/orders/:id", handler.DeleteOrder)
			userProtected.POST("/orders/:id/submit", handler.SubmitOrder)
			userProtected.POST("/orders/:id/reference-images", handler.UploadOrderReferenceImages)
			userProtected.DELETE("/orders/:id/reference-images/:imageId", handler.DeleteOrderReferenceImage)
			userProtected.GET("/orders/:id/reference-images/:imageId/content", handler.GetOrderReferenceImageContent)
			userProtected.GET("/orders/:id", handler.GetOrder)
		}

		v1.POST("/contact-requests", handler.CreateContactRequest)
		v1.GET("/images", handler.ListProjectImages)
		v1.GET("/images/:id/content", handler.GetProjectImageContent)
		v1.GET("/hero-slides", handler.ListHeroSlides)
		v1.GET("/hero-slides/:id/content", handler.GetHeroSlideContent)
		v1.GET("/products", handler.ListProducts)
		v1.GET("/products/:id", handler.GetProduct)
		v1.GET("/courses", handler.ListCourses)
		v1.GET("/courses/:id", handler.GetCourse)
		v1.GET("/courses/:id/images/:imageId/content", handler.GetCourseImageContent)
		v1.GET("/blogs", handler.ListBlogs)
		v1.GET("/blogs/:slug", handler.GetBlog)
		v1.GET("/blog-images/:id/content", handler.GetBlogImageContent)
		v1.GET("/image-variants/:id/content", handler.GetImageVariantContent)

		admin := v1.Group("/admin")
		admin.Use(adminPrivateMiddleware())
		{
			admin.POST("/login", handler.AdminLogin)

			protected := admin.Group("")
			protected.Use(adminAuthMiddleware(cfg.Admin.Token))
			{
				protected.GET("/contact-requests", handler.ListContactRequests)
				protected.DELETE("/contact-requests/:id", handler.DeleteContactRequest)
				protected.GET("/course-signups", handler.ListCourseSignups)
				protected.DELETE("/course-signups/:id", handler.DeleteCourseSignup)
				protected.GET("/project-images", handler.ListProjectImages)
				protected.POST("/project-images", handler.UploadProjectImages)
				protected.DELETE("/project-images/:id", handler.DeleteProjectImage)
				protected.GET("/hero-slides", handler.ListHeroSlides)
				protected.POST("/hero-slides", handler.UploadHeroSlides)
				protected.DELETE("/hero-slides/:id", handler.DeleteHeroSlide)
				protected.GET("/products", handler.ListAdminProducts)
				protected.POST("/products", handler.CreateAdminProduct)
				protected.GET("/products/:id", handler.GetAdminProduct)
				protected.PUT("/products/:id", handler.UpdateAdminProduct)
				protected.PATCH("/products/:id/status", handler.UpdateAdminProductStatus)
				protected.POST("/image-variants/rebuild", handler.RebuildImageVariants)
				protected.GET("/orders", handler.ListAdminOrders)
				protected.GET("/orders/:id", handler.GetAdminOrder)
				protected.PATCH("/orders/:id/status", handler.UpdateAdminOrderStatus)
				protected.GET("/courses", handler.ListAdminCourses)
				protected.POST("/courses", handler.CreateAdminCourse)
				protected.GET("/courses/:id", handler.GetAdminCourse)
				protected.PUT("/courses/:id", handler.UpdateAdminCourse)
				protected.DELETE("/courses/:id", handler.DeleteAdminCourse)
				protected.GET("/courses/:id/accesses", handler.ListAdminCourseAccesses)
				protected.POST("/courses/:id/accesses", handler.GrantAdminCourseAccess)
				protected.DELETE("/courses/:id/accesses/:accessId", handler.RevokeAdminCourseAccess)
				protected.GET("/courses/:id/images", handler.ListCourseImages)
				protected.POST("/courses/:id/images", handler.UploadCourseImages)
				protected.DELETE("/courses/:id/images/:imageId", handler.DeleteCourseImage)
				protected.GET("/blogs", handler.ListAdminBlogs)
				protected.POST("/blogs", handler.CreateAdminBlog)
				protected.GET("/blogs/:id", handler.GetAdminBlog)
				protected.PUT("/blogs/:id", handler.UpdateAdminBlog)
				protected.DELETE("/blogs/:id", handler.DeleteAdminBlog)
				protected.PATCH("/blogs/:id/publication", handler.UpdateAdminBlogPublication)
				protected.PATCH("/blogs/:id/published-at", handler.UpdateAdminBlogPublishedAt)
				protected.POST("/blogs/:id/preview", handler.PreviewAdminBlog)
				protected.GET("/blogs/:id/images", handler.ListAdminBlogImages)
				protected.POST("/blogs/:id/images", handler.UploadAdminBlogImages)
				protected.PUT("/blogs/:id/images/:imageId", handler.UpdateAdminBlogImage)
				protected.DELETE("/blogs/:id/images/:imageId", handler.DeleteAdminBlogImage)
				protected.GET("/blog-categories", handler.ListAdminBlogCategories)
				protected.POST("/blog-categories", handler.CreateAdminBlogCategory)
				protected.PUT("/blog-categories/:id", handler.UpdateAdminBlogCategory)
				protected.DELETE("/blog-categories/:id", handler.DeleteAdminBlogCategory)
			}
		}
	}

	router.NoRoute(handler.SiteShell)
	handler.StartBlogScheduler()

	return router
}

func corsMiddleware(allowedOrigins []string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	allowAll := false
	for _, origin := range allowedOrigins {
		if origin == "*" {
			allowAll = true
			continue
		}
		allowed[strings.TrimRight(origin, "/")] = struct{}{}
	}

	return func(c *gin.Context) {
		origin := strings.TrimRight(c.GetHeader("Origin"), "/")
		if origin != "" {
			if allowAll {
				c.Header("Access-Control-Allow-Origin", origin)
			} else if _, ok := allowed[origin]; ok {
				c.Header("Access-Control-Allow-Origin", origin)
			}
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Credentials", "true")
		}

		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == http.MethodOptions {
			c.Status(http.StatusNoContent)
			c.Abort()
			return
		}

		c.Next()
	}
}

func adminAuthMiddleware(token string) gin.HandlerFunc {
	expected := "Bearer " + token

	return func(c *gin.Context) {
		c.Header("X-Robots-Tag", "noindex, nofollow, noarchive")
		c.Header("Cache-Control", "private, no-store")
		got := c.GetHeader("Authorization")
		if subtle.ConstantTimeCompare([]byte(got), []byte(expected)) != 1 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "دسترسی ادمین معتبر نیست."})
			return
		}

		c.Next()
	}
}

func adminPrivateMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Robots-Tag", "noindex, nofollow, noarchive")
		c.Header("Cache-Control", "private, no-store")
		c.Next()
	}
}
