package main

import (
	"context"
	"log"

	"traxr-backend/internal/config"
	"traxr-backend/internal/db"
	"traxr-backend/internal/services"
)

func main() {
	cfg := config.Load()
	pool := db.NewPool(cfg.DatabaseURL)

	if err := services.SeedDemoData(context.Background(), pool); err != nil {
		log.Fatal(err)
	}

	log.Println("seed complete")
}
