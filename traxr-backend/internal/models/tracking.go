package models

type TrackingUpdate struct {
	Status   string  `json:"status" binding:"required"`
	Location string  `json:"location" binding:"required"`
	Lat      float64 `json:"lat" binding:"required"`
	Lng      float64 `json:"lng" binding:"required"`
	Note     string  `json:"note"`
}
