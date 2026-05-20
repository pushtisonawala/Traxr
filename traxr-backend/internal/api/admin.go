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
