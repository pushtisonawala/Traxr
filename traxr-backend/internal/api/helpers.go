package api

import (
	"github.com/gin-gonic/gin"

	"traxr-backend/internal/models"
)

func orderPayload(order *models.OrderWithEvents) gin.H {
	return gin.H{
		"id":              order.ID,
		"tracking_id":     order.TrackingID,
		"user_id":         order.UserID,
		"customer_name":   order.CustomerName,
		"customer_phone":  order.CustomerPhone,
		"origin":          order.Origin,
		"destination":     order.Destination,
		"origin_lat":      order.OriginLat,
		"origin_lng":      order.OriginLng,
		"dest_lat":        order.DestLat,
		"dest_lng":        order.DestLng,
		"current_lat":     order.CurrentLat,
		"current_lng":     order.CurrentLng,
		"status":          order.Status,
		"weight_kg":       order.WeightKg,
		"est_delivery":    order.EstDelivery,
		"ai_prediction":   order.AIPrediction,
		"tracking_events": order.TrackingEvents,
		"is_real":         order.IsReal,
		"courier":         order.Courier,
		"created_at":      order.CreatedAt,
		"updated_at":      order.UpdatedAt,
	}
}
