package services

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"traxr-backend/internal/models"
)

type seedRoute struct {
	Origin      string
	Destination string
}

var seedRoutes = []seedRoute{
	{Origin: "Mumbai", Destination: "Bangalore"},
	{Origin: "Delhi", Destination: "Chennai"},
	{Origin: "Pune", Destination: "Hyderabad"},
	{Origin: "Kolkata", Destination: "Mumbai"},
	{Origin: "Ahmedabad", Destination: "Delhi"},
}

var seedCustomerNames = []string{
	"Aarav Sharma", "Diya Patel", "Rohan Kulkarni", "Meera Iyer", "Kabir Mehta",
	"Ananya Sen", "Ishaan Verma", "Priya Nair", "Vivaan Singh", "Sana Khan",
	"Arjun Rao", "Neha Joshi", "Aditya Das", "Kavya Menon", "Rahul Bedi",
}

func SeedDemoData(ctx context.Context, pool *pgxpool.Pool) error {
	_, _ = pool.Exec(ctx, "DELETE FROM tracking_events")
	_, _ = pool.Exec(ctx, "DELETE FROM orders")
	_, _ = pool.Exec(ctx, "DELETE FROM users")

	passwordHash, _ := bcrypt.GenerateFromPassword([]byte("demo1234"), bcrypt.DefaultCost)
	var userID string
	if err := pool.QueryRow(ctx, "INSERT INTO users (email, name, password) VALUES ($1,$2,$3) RETURNING id", "demo@traxr.com", "Traxr Demo", string(passwordHash)).Scan(&userID); err != nil {
		return err
	}

	statusPools := [][]models.OrderStatus{
		{models.StatusPlaced, models.StatusPickedUp, models.StatusInTransit},
		{models.StatusPlaced, models.StatusPickedUp, models.StatusInTransit, models.StatusOutForDelivery},
		{models.StatusPlaced, models.StatusPickedUp, models.StatusInTransit, models.StatusDelayed},
		{models.StatusPlaced, models.StatusPickedUp, models.StatusInTransit, models.StatusOutForDelivery, models.StatusDelivered},
	}

	rnd := rand.New(rand.NewSource(time.Now().UnixNano()))
	for i := 0; i < 15; i++ {
		route := seedRoutes[i%len(seedRoutes)]
		origin := IndianCities[route.Origin]
		dest := IndianCities[route.Destination]
		statusHistory := statusPools[rnd.Intn(len(statusPools))]
		finalStatus := statusHistory[len(statusHistory)-1]

		currentLat := origin.Lat
		currentLng := origin.Lng
		if finalStatus == models.StatusInTransit || finalStatus == models.StatusDelayed || finalStatus == models.StatusOutForDelivery {
			currentLat = (origin.Lat + dest.Lat) / 2
			currentLng = (origin.Lng + dest.Lng) / 2
		}
		if finalStatus == models.StatusDelivered {
			currentLat = dest.Lat
			currentLng = dest.Lng
		}

		trackingID := fmt.Sprintf("TRX-%s-%05d", time.Now().Format("20060102"), i+1)
		var orderID string
		createdAt := time.Now().Add(time.Duration(-rnd.Intn(120)) * time.Hour)
		err := pool.QueryRow(ctx, `
			INSERT INTO orders (
				tracking_id, user_id, customer_name, customer_phone, origin, destination,
				origin_lat, origin_lng, dest_lat, dest_lng, current_lat, current_lng,
				status, weight_kg, est_delivery, ai_prediction, created_at, updated_at
			)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)
			RETURNING id`,
			trackingID, userID, seedCustomerNames[i], fmt.Sprintf("+91-98%08d", 100000+i), route.Origin, route.Destination,
			origin.Lat, origin.Lng, dest.Lat, dest.Lng, currentLat, currentLng, finalStatus,
			2+rnd.Float64()*18, createdAt.Add(48*time.Hour), "Prediction unavailable - tracking normally.", createdAt,
		).Scan(&orderID)
		if err != nil {
			return err
		}

		for j, status := range statusHistory {
			ts := createdAt.Add(time.Duration(j*12) * time.Hour)
			lat := origin.Lat + (float64(j)/float64(len(statusHistory))) * (dest.Lat-origin.Lat)
			lng := origin.Lng + (float64(j)/float64(len(statusHistory))) * (dest.Lng-origin.Lng)
			location := SimulationLocation(string(status), route.Destination)
			if status == models.StatusPlaced {
				location = route.Origin
				lat = origin.Lat
				lng = origin.Lng
			}
			if status == models.StatusDelivered {
				location = route.Destination
				lat = dest.Lat
				lng = dest.Lng
			}

			if _, err := pool.Exec(ctx, `
				INSERT INTO tracking_events (order_id, status, location, lat, lng, note, created_at)
				VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				orderID, status, location, lat, lng, "Seeded journey update", ts,
			); err != nil {
				return err
			}
		}
	}

	return nil
}
