package services

import (
	"math"
	"strings"

	"traxr-backend/internal/models"
)

type City struct {
	Name string
	Lat  float64
	Lng  float64
}

var IndianCities = map[string]City{
	"Mumbai":    {Name: "Mumbai", Lat: 19.0760, Lng: 72.8777},
	"Delhi":     {Name: "Delhi", Lat: 28.6139, Lng: 77.2090},
	"Bangalore": {Name: "Bangalore", Lat: 12.9716, Lng: 77.5946},
	"Chennai":   {Name: "Chennai", Lat: 13.0827, Lng: 80.2707},
	"Hyderabad": {Name: "Hyderabad", Lat: 17.3850, Lng: 78.4867},
	"Pune":      {Name: "Pune", Lat: 18.5204, Lng: 73.8567},
	"Kolkata":   {Name: "Kolkata", Lat: 22.5726, Lng: 88.3639},
	"Ahmedabad": {Name: "Ahmedabad", Lat: 23.0225, Lng: 72.5714},
}

func HumanizeStatus(status string) string {
	return strings.ReplaceAll(strings.Title(strings.ReplaceAll(status, "_", " ")), "Of", "of")
}

func Interpolate(order models.Order, fraction float64) (float64, float64) {
	lat := order.CurrentLat + ((order.DestLat - order.CurrentLat) * fraction)
	lng := order.CurrentLng + ((order.DestLng - order.CurrentLng) * fraction)
	return math.Round(lat*10000) / 10000, math.Round(lng*10000) / 10000
}

func SimulationLocation(status string, destination string) string {
	switch status {
	case string(models.StatusPickedUp):
		return "Origin sorting hub"
	case string(models.StatusInTransit):
		return "NH corridor line-haul checkpoint"
	case string(models.StatusOutForDelivery):
		return destination + " delivery hub"
	case string(models.StatusDelivered):
		return destination + " final doorstep"
	default:
		return "Booking desk"
	}
}
