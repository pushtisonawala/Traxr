package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"traxr-backend/internal/services"
)

func (h *Handler) ResetAndSeed(c *gin.Context) {
	if err := services.SeedDemoData(c.Request.Context(), h.DB); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to seed demo data"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Created 15 demo orders with demo@traxr.com / demo1234",
	})
}

func (h *Handler) AdminRandomActive(c *gin.Context) {
	var id, trackingID string
	err := h.DB.QueryRow(c.Request.Context(), `
		SELECT id, tracking_id
		FROM orders
		WHERE status != 'delivered'
		ORDER BY RANDOM()
		LIMIT 1`,
	).Scan(&id, &trackingID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no active orders available"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          id,
		"tracking_id": trackingID,
	})
}
