package services

import (
	"fmt"
	"math"
	"math/rand"
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

func SeedEventNote(status models.OrderStatus, origin, nearestCity string, rnd *rand.Rand) string {
	switch status {
	case models.StatusPlaced:
		return fmt.Sprintf("Order confirmed at %s warehouse", origin)
	case models.StatusPickedUp:
		return fmt.Sprintf("Package picked up from %s facility by courier partner", origin)
	case models.StatusInTransit:
		highways := []int{48, 44, 8, 4}
		return fmt.Sprintf("Package in transit via NH-%d highway corridor", highways[rnd.Intn(len(highways))])
	case models.StatusOutForDelivery:
		return fmt.Sprintf("Out for delivery with field agent #%d", 100+rnd.Intn(900))
	case models.StatusDelivered:
		return "Package delivered and signed by recipient"
	case models.StatusDelayed:
		return fmt.Sprintf("Delay due to high volume at %s sorting hub - rescheduled", nearestCity)
	default:
		return "Shipment update received"
	}
}
