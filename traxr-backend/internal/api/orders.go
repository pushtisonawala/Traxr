package api

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"traxr-backend/internal/models"
	"traxr-backend/internal/services"
)

type createOrderRequest struct {
	CustomerName  string    `json:"customer_name" binding:"required"`
	CustomerPhone string    `json:"customer_phone"`
	Origin        string    `json:"origin" binding:"required"`
	Destination   string    `json:"destination" binding:"required"`
	WeightKg      float64   `json:"weight_kg"`
	EstDelivery   time.Time `json:"est_delivery" binding:"required"`
}

func (h *Handler) CreateOrder(c *gin.Context) {
	var req createOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Origin == req.Destination {
		c.JSON(http.StatusBadRequest, gin.H{"error": "origin and destination must differ"})
		return
	}

	origin, ok := services.IndianCities[req.Origin]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported origin"})
		return
	}
	destination, ok := services.IndianCities[req.Destination]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported destination"})
		return
	}

	trackingID, err := services.GenerateTrackingID(c.Request.Context(), func(ctx context.Context, trackingID string) (bool, error) {
		var exists bool
		err := h.DB.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM orders WHERE tracking_id = $1)", trackingID).Scan(&exists)
		return exists, err
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate tracking ID"})
		return
	}

	userID := c.GetString("user_id")
	var order models.Order
	query := `
		INSERT INTO orders (
			tracking_id, user_id, customer_name, customer_phone, origin, destination,
			origin_lat, origin_lng, dest_lat, dest_lng, current_lat, current_lng,
			status, weight_kg, est_delivery
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$7,$8,$11,$12,$13)
		RETURNING id, tracking_id, user_id, customer_name, customer_phone, origin, destination,
			origin_lat, origin_lng, dest_lat, dest_lng, current_lat, current_lng,
			status, weight_kg, est_delivery, COALESCE(ai_prediction, ''), created_at, updated_at`
	err = h.DB.QueryRow(c.Request.Context(), query,
		trackingID, userID, req.CustomerName, req.CustomerPhone, req.Origin, req.Destination,
		origin.Lat, origin.Lng, destination.Lat, destination.Lng, models.StatusPlaced, req.WeightKg, req.EstDelivery,
	).Scan(
		&order.ID, &order.TrackingID, &order.UserID, &order.CustomerName, &order.CustomerPhone, &order.Origin, &order.Destination,
		&order.OriginLat, &order.OriginLng, &order.DestLat, &order.DestLng, &order.CurrentLat, &order.CurrentLng,
		&order.Status, &order.WeightKg, &order.EstDelivery, &order.AIPrediction, &order.CreatedAt, &order.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create order"})
		return
	}

	if err := h.insertEvent(c.Request.Context(), order.ID, string(models.StatusPlaced), req.Origin, origin.Lat, origin.Lng, "Shipment created"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create tracking event"})
		return
	}

	c.JSON(http.StatusCreated, order)
}

func (h *Handler) ListOrders(c *gin.Context) {
	userID := c.GetString("user_id")
	rows, err := h.DB.Query(c.Request.Context(), `
		SELECT id, tracking_id, user_id, customer_name, customer_phone, origin, destination,
			origin_lat, origin_lng, dest_lat, dest_lng, current_lat, current_lng,
			status, weight_kg, est_delivery, COALESCE(ai_prediction, ''), created_at, updated_at
		FROM orders WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list orders"})
		return
	}
	defer rows.Close()

	orders := make([]models.Order, 0)
	for rows.Next() {
		var order models.Order
		if err := rows.Scan(
			&order.ID, &order.TrackingID, &order.UserID, &order.CustomerName, &order.CustomerPhone, &order.Origin, &order.Destination,
			&order.OriginLat, &order.OriginLng, &order.DestLat, &order.DestLng, &order.CurrentLat, &order.CurrentLng,
			&order.Status, &order.WeightKg, &order.EstDelivery, &order.AIPrediction, &order.CreatedAt, &order.UpdatedAt,
		); err == nil {
			orders = append(orders, order)
		}
	}

	c.JSON(http.StatusOK, orders)
}

func (h *Handler) GetOrder(c *gin.Context) {
	orderID := c.Param("id")
	userID := c.GetString("user_id")

	order, err := h.fetchOrderWithEvents(c.Request.Context(), "SELECT id, tracking_id, user_id, customer_name, customer_phone, origin, destination, origin_lat, origin_lng, dest_lat, dest_lng, current_lat, current_lng, status, weight_kg, est_delivery, COALESCE(ai_prediction, ''), created_at, updated_at FROM orders WHERE id = $1 AND user_id = $2", orderID, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch order"})
		return
	}

	c.JSON(http.StatusOK, order)
}

func (h *Handler) GetPublicTracking(c *gin.Context) {
	trackingID := c.Param("trackingId")

	order, err := h.fetchOrderWithEvents(c.Request.Context(), "SELECT id, tracking_id, user_id, customer_name, customer_phone, origin, destination, origin_lat, origin_lng, dest_lat, dest_lng, current_lat, current_lng, status, weight_kg, est_delivery, COALESCE(ai_prediction, ''), created_at, updated_at FROM orders WHERE tracking_id = $1", trackingID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch order"})
		return
	}

	c.JSON(http.StatusOK, order)
}

func (h *Handler) TrackReal(c *gin.Context) {
	trackingNumber := c.Param("trackingNumber")
	if trackingNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "tracking number required"})
		return
	}

	courierHint := c.Query("courier")
	result, err := services.FetchRealTracking(trackingNumber, courierHint, h.Config.TrackingMoreAPIKey)
	if err != nil {
		if strings.Contains(err.Error(), services.ErrTrackingAlreadyRegisteredNoEvents) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "This tracking number is already registered in Trackingmore, but live checkpoints are not currently accessible through the API. Try a fresh tracking number, or re-check with an explicit courier hint like Delhivery.",
			})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Tracking info not found. Supported couriers: Bluedart, Delhivery, DTDC, Ecom Express, XpressBees, FedEx, DHL",
		})
		return
	}

	aiPrediction, _ := services.GenerateDelayPrediction(
		result.Origin, result.Destination,
		string(result.Status), result.Events[0].Location,
		h.Config.GeminiAPIKey,
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"tracking_id":     trackingNumber,
			"customer_name":   "Live shipment",
			"customer_phone":  "",
			"origin":          result.Origin,
			"destination":     result.Destination,
			"origin_lat":      result.OriginLat,
			"origin_lng":      result.OriginLng,
			"dest_lat":        result.DestLat,
			"dest_lng":        result.DestLng,
			"current_lat":     result.CurrentLat,
			"current_lng":     result.CurrentLng,
			"status":          result.Status,
			"weight_kg":       0.0,
			"ai_prediction":   aiPrediction,
			"tracking_events": result.Events,
			"is_real":         true,
			"courier":         result.CourierName,
			"est_delivery":    time.Now().Add(24 * time.Hour),
			"created_at":      time.Now(),
			"updated_at":      time.Now(),
		},
	})
}

func (h *Handler) AdminOrders(c *gin.Context) {
	rows, err := h.DB.Query(c.Request.Context(), `
		SELECT id, tracking_id, user_id, customer_name, customer_phone, origin, destination,
			origin_lat, origin_lng, dest_lat, dest_lng, current_lat, current_lng,
			status, weight_kg, est_delivery, COALESCE(ai_prediction, ''), created_at, updated_at
		FROM orders ORDER BY created_at DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list orders"})
		return
	}
	defer rows.Close()

	orders := make([]models.Order, 0)
	for rows.Next() {
		var order models.Order
		if err := rows.Scan(
			&order.ID, &order.TrackingID, &order.UserID, &order.CustomerName, &order.CustomerPhone, &order.Origin, &order.Destination,
			&order.OriginLat, &order.OriginLng, &order.DestLat, &order.DestLng, &order.CurrentLat, &order.CurrentLng,
			&order.Status, &order.WeightKg, &order.EstDelivery, &order.AIPrediction, &order.CreatedAt, &order.UpdatedAt,
		); err == nil {
			orders = append(orders, order)
		}
	}

	c.JSON(http.StatusOK, orders)
}

func (h *Handler) fetchOrderWithEvents(ctx context.Context, query string, args ...any) (*models.OrderWithEvents, error) {
	var order models.OrderWithEvents
	err := h.DB.QueryRow(ctx, query, args...).Scan(
		&order.ID, &order.TrackingID, &order.UserID, &order.CustomerName, &order.CustomerPhone, &order.Origin, &order.Destination,
		&order.OriginLat, &order.OriginLng, &order.DestLat, &order.DestLng, &order.CurrentLat, &order.CurrentLng,
		&order.Status, &order.WeightKg, &order.EstDelivery, &order.AIPrediction, &order.CreatedAt, &order.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	rows, err := h.DB.Query(ctx, `
		SELECT id, order_id, status, location, lat, lng, COALESCE(note, ''), created_at
		FROM tracking_events WHERE order_id = $1 ORDER BY created_at DESC`, order.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	order.TrackingEvents = make([]models.TrackingEvent, 0)
	for rows.Next() {
		var event models.TrackingEvent
		if err := rows.Scan(&event.ID, &event.OrderID, &event.Status, &event.Location, &event.Lat, &event.Lng, &event.Note, &event.CreatedAt); err == nil {
			order.TrackingEvents = append(order.TrackingEvents, event)
		}
	}

	return &order, nil
}

func (h *Handler) insertEvent(ctx context.Context, orderID, status, location string, lat, lng float64, note string) error {
	_, err := h.DB.Exec(ctx, `
		INSERT INTO tracking_events (order_id, status, location, lat, lng, note)
		VALUES ($1,$2,$3,$4,$5,$6)`, orderID, status, location, lat, lng, note)
	return err
}
