package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL   string
	RedisURL      string
	JWTSecret     string
	GeminiAPIKey  string
	Port          string
	AllowedOrigin string
}

func Load() Config {
	if err := godotenv.Load(); err != nil {
		log.Println("config: .env not found, using environment variables")
	}

	return Config{
		DatabaseURL:   getenv("DATABASE_URL", "postgres://traxr:traxrpass@localhost:5432/traxr"),
		RedisURL:      getenv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:     getenv("JWT_SECRET", "change-me"),
		GeminiAPIKey:  os.Getenv("GEMINI_API_KEY"),
		Port:          getenv("PORT", "8080"),
		AllowedOrigin: getenv("ALLOWED_ORIGIN", "http://localhost:3000"),
	}
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}
