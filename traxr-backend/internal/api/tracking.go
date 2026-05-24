package api

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"traxr-backend/internal/models"
	"traxr-backend/internal/services"
)

var simulationSequence = []string{
	string(models.StatusPlaced),
	string(models.StatusPickedUp),
	string(models.StatusInTransit),
	string(models.StatusOutForDelivery),
	string(models.StatusDelivered),
}

func (h *Handler) UpdateTracking(c *gin.Context) {
	orderID := c.Param("orderId")
	var req models.TrackingUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	order, err := h.updateOrderAndEvent(c.Request.Context(), orderID, req.Status, req.Location, req.Lat, req.Lng, req.Note)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update tracking"})
		return
	}

	c.JSON(http.StatusOK, order)
}

func (h *Handler) AdminSimulate(c *gin.Context) {
	orderID := c.Param("orderId")
	order, err := h.fetchOrderWithEvents(c.Request.Context(), orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	currentIndex := 0
	for i, status := range simulationSequence {
		if status == string(order.Status) {
			currentIndex = i
			break
		}
	}
	nextIndex := currentIndex + 1
	if nextIndex >= len(simulationSequence) {
		nextIndex = len(simulationSequence) - 1
	}
	nextStatus := simulationSequence[nextIndex]
	lat, lng := services.Interpolate(order.Order, 0.2)
	if nextStatus == string(models.StatusDelivered) {
		lat = order.DestLat
		lng = order.DestLng
	}

	location := map[string]string{
		string(models.StatusPickedUp):       fmt.Sprintf("%s pickup facility", order.Origin),
		string(models.StatusInTransit):      "NH corridor checkpoint",
		string(models.StatusOutForDelivery): fmt.Sprintf("%s delivery hub", order.Destination),
		string(models.StatusDelivered):      fmt.Sprintf("%s - delivered", order.Destination),
	}[nextStatus]
	if location == "" {
		location = services.SimulationLocation(nextStatus, order.Destination)
	}
	note := map[string]string{
		string(models.StatusPickedUp):       fmt.Sprintf("Package picked up from %s warehouse", order.Origin),
		string(models.StatusInTransit):      "Package in transit via highway corridor",
		string(models.StatusOutForDelivery): fmt.Sprintf("Out for delivery with agent #%d", 100+rand.Intn(900)),
		string(models.StatusDelivered):      "Package delivered and signed by recipient",
	}[nextStatus]
	updated, err := h.updateOrderAndEvent(c.Request.Context(), orderID, nextStatus, location, lat, lng, note)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to simulate order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"new_status": nextStatus,
			"location":   location,
			"note":       note,
			"order":      orderPayload(updated),
		},
	})
}

func (h *Handler) updateOrderAndEvent(ctx context.Context, orderID, status, location string, lat, lng float64, note string) (*models.OrderWithEvents, error) {
	_, err := h.DB.Exec(ctx, `
		UPDATE orders
		SET status = $2, current_lat = $3, current_lng = $4, updated_at = NOW()
		WHERE id = $1`, orderID, status, lat, lng)
	if err != nil {
		return nil, err
	}

	if err := h.insertEvent(ctx, orderID, status, location, lat, lng, note); err != nil {
		return nil, err
	}

	order, err := h.fetchOrderWithEvents(ctx, orderID)
	if err != nil {
		return nil, err
	}

	if status == string(models.StatusDelayed) || status == string(models.StatusOutForDelivery) {
		prediction := h.AI.PredictDelay(ctx, order.Order, location)
		if _, err := h.DB.Exec(ctx, "UPDATE orders SET ai_prediction = $2, updated_at = NOW() WHERE id = $1", orderID, prediction); err == nil {
			order.AIPrediction = prediction
			order.UpdatedAt = time.Now()
		}
	}

	_ = h.Redis.Del(ctx, "track:"+order.TrackingID).Err()
	h.publishOrder(ctx, orderID, order)
	return order, nil
}
