package models

import "time"

type OrderStatus string

const (
	StatusPlaced         OrderStatus = "placed"
	StatusPickedUp       OrderStatus = "picked_up"
	StatusInTransit      OrderStatus = "in_transit"
	StatusOutForDelivery OrderStatus = "out_for_delivery"
	StatusDelivered      OrderStatus = "delivered"
	StatusDelayed        OrderStatus = "delayed"
)

type Order struct {
	ID            string      `json:"id"`
	TrackingID    string      `json:"tracking_id"`
	UserID        string      `json:"user_id"`
	CustomerName  string      `json:"customer_name"`
	CustomerPhone string      `json:"customer_phone"`
	Origin        string      `json:"origin"`
	Destination   string      `json:"destination"`
	OriginLat     float64     `json:"origin_lat"`
	OriginLng     float64     `json:"origin_lng"`
	DestLat       float64     `json:"dest_lat"`
	DestLng       float64     `json:"dest_lng"`
	CurrentLat    float64     `json:"current_lat"`
	CurrentLng    float64     `json:"current_lng"`
	Status        OrderStatus `json:"status"`
	WeightKg      float64     `json:"weight_kg"`
	EstDelivery   time.Time   `json:"est_delivery"`
	AIPrediction  string      `json:"ai_prediction"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
}

type TrackingEvent struct {
	ID        string    `json:"id"`
	OrderID   string    `json:"order_id"`
	Status    string    `json:"status"`
	Location  string    `json:"location"`
	Lat       float64   `json:"lat"`
	Lng       float64   `json:"lng"`
	Note      string    `json:"note"`
	CreatedAt time.Time `json:"created_at"`
}

type OrderWithEvents struct {
	Order
	TrackingEvents []TrackingEvent `json:"tracking_events"`
}

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}
