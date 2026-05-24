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

	var exists bool
	err := h.DB.QueryRow(c.Request.Context(), "SELECT EXISTS(SELECT 1 FROM orders WHERE id = $1 AND user_id = $2)", orderID, userID).Scan(&exists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch order"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	order, err := h.fetchOrderWithEvents(c.Request.Context(), orderID)
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

	orderID, err := h.getOrderIDByTrackingID(c.Request.Context(), trackingID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch order"})
		return
	}

	order, err := h.fetchOrderWithEvents(c.Request.Context(), orderID)
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

func (h *Handler) getOrderIDByTrackingID(ctx context.Context, trackingID string) (string, error) {
	var id string
	err := h.DB.QueryRow(ctx, "SELECT id FROM orders WHERE tracking_id = $1", trackingID).Scan(&id)
	if err != nil {
		return "", err
	}

	return id, nil
}

func (h *Handler) fetchOrderWithEvents(ctx context.Context, orderID string) (*models.OrderWithEvents, error) {
	rows, err := h.DB.Query(ctx, `
		SELECT 
			o.id, o.tracking_id, o.user_id, o.customer_name, o.customer_phone,
			o.origin, o.destination, o.origin_lat, o.origin_lng,
			o.dest_lat, o.dest_lng, o.current_lat, o.current_lng,
			o.status, o.weight_kg, o.est_delivery,
			COALESCE(o.ai_prediction, ''), o.created_at, o.updated_at,
			te.id, te.order_id, te.status, te.location,
			te.lat, te.lng, COALESCE(te.note, ''), te.created_at
		FROM orders o
		LEFT JOIN tracking_events te ON te.order_id = o.id
		WHERE o.id = $1
		ORDER BY te.created_at DESC
	`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var order *models.OrderWithEvents
	for rows.Next() {
		var eventID, eventOrderID, eventStatus, eventLocation, eventNote *string
		var eventLat, eventLng *float64
		var eventCreatedAt *time.Time

		if order == nil {
			order = &models.OrderWithEvents{}
			order.TrackingEvents = make([]models.TrackingEvent, 0)
		}

		err := rows.Scan(
			&order.ID, &order.TrackingID, &order.UserID,
			&order.CustomerName, &order.CustomerPhone,
			&order.Origin, &order.Destination,
			&order.OriginLat, &order.OriginLng,
			&order.DestLat, &order.DestLng,
			&order.CurrentLat, &order.CurrentLng,
			&order.Status, &order.WeightKg, &order.EstDelivery,
			&order.AIPrediction, &order.CreatedAt, &order.UpdatedAt,
			&eventID, &eventOrderID, &eventStatus, &eventLocation,
			&eventLat, &eventLng, &eventNote, &eventCreatedAt,
		)
		if err != nil {
			return nil, err
		}

		if eventID != nil {
			order.TrackingEvents = append(order.TrackingEvents, models.TrackingEvent{
				ID:        *eventID,
				OrderID:   derefString(eventOrderID),
				Status:    derefString(eventStatus),
				Location:  derefString(eventLocation),
				Lat:       derefFloat64(eventLat),
				Lng:       derefFloat64(eventLng),
				Note:      derefString(eventNote),
				CreatedAt: derefTime(eventCreatedAt),
			})
		}
	}

	if order == nil {
		return nil, pgx.ErrNoRows
	}

	return order, nil
}

func (h *Handler) insertEvent(ctx context.Context, orderID, status, location string, lat, lng float64, note string) error {
	_, err := h.DB.Exec(ctx, `
		INSERT INTO tracking_events (order_id, status, location, lat, lng, note)
		VALUES ($1,$2,$3,$4,$5,$6)`, orderID, status, location, lat, lng, note)
	return err
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func derefFloat64(value *float64) float64 {
	if value == nil {
		return 0
	}
	return *value
}

func derefTime(value *time.Time) time.Time {
	if value == nil {
		return time.Time{}
	}
	return *value
}
