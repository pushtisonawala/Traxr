package main

import (
	"context"
	"log"

	"traxr-backend/internal/api"
	"traxr-backend/internal/config"
	"traxr-backend/internal/db"
	"traxr-backend/internal/services"
	"traxr-backend/internal/ws"

	"github.com/redis/go-redis/v9"
)

func main() {
	cfg := config.Load()
	pool := db.NewPool(cfg.DatabaseURL)

	redisOpts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}
	redisClient := redis.NewClient(redisOpts)

	hub := ws.NewHub()
	go hub.Run()
	api.StartRedisSubscriber(context.Background(), redisClient, hub)

	handler := &api.Handler{
		DB:     pool,
		Redis:  redisClient,
		Hub:    hub,
		Config: cfg,
		AI:     services.NewAIService(cfg.GeminiAPIKey),
	}

	router := api.SetupRouter(handler)
	log.Printf("Traxr backend listening on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
