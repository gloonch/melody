package config

import "testing"

func TestValidateProductionRequiresCanonicalDomainAndStrongSecrets(t *testing.T) {
	valid := &Config{
		App:   AppConfig{Environment: "production", BaseURL: "https://golmelo.com"},
		Admin: AdminConfig{Password: "strong-production-password", Token: "strong-production-admin-token"},
		Auth:  AuthConfig{JWTSecret: "strong-production-jwt-secret"},
	}
	if err := valid.Validate(); err != nil {
		t.Fatalf("valid production config was rejected: %v", err)
	}

	invalidURL := *valid
	invalidURL.App.BaseURL = "http://localhost:8080"
	if err := invalidURL.Validate(); err == nil {
		t.Fatal("localhost production canonical must be rejected")
	}

	invalidSecret := *valid
	invalidSecret.Admin.Token = "change_me_admin_token_before_deploy"
	if err := invalidSecret.Validate(); err == nil {
		t.Fatal("placeholder production secret must be rejected")
	}
}
