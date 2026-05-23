package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"traxr-backend/internal/models"
)

var cityCoords = map[string][2]float64{
	"mumbai":        {19.0760, 72.8777},
	"bangalore":     {12.9716, 77.5946},
	"bengaluru":     {12.9716, 77.5946},
	"delhi":         {28.6139, 77.2090},
	"new delhi":     {28.6139, 77.2090},
	"chennai":       {13.0827, 80.2707},
	"hyderabad":     {17.3850, 78.4867},
	"pune":          {18.5204, 73.8567},
	"kolkata":       {22.5726, 88.3639},
	"ahmedabad":     {23.0225, 72.5714},
	"jaipur":        {26.9124, 75.7873},
	"surat":         {21.1702, 72.8311},
	"lucknow":       {26.8467, 80.9462},
	"nagpur":        {21.1458, 79.0882},
	"indore":        {22.7196, 75.8577},
	"bhopal":        {23.2599, 77.4126},
	"chandigarh":    {30.7333, 76.7794},
	"kochi":         {9.9312, 76.2673},
	"coimbatore":    {11.0168, 76.9558},
	"gurgaon":       {28.4595, 77.0266},
	"gurugram":      {28.4595, 77.0266},
	"noida":         {28.5355, 77.3910},
	"faridabad":     {28.4089, 77.3178},
	"vadodara":      {22.3072, 73.1812},
	"patna":         {25.5941, 85.1376},
	"bhubaneswar":   {20.2961, 85.8245},
	"visakhapatnam": {17.6868, 83.2185},
}

func getCoordsForLocation(location string) (float64, float64) {
	lower := strings.ToLower(location)
	for city, coords := range cityCoords {
		if strings.Contains(lower, city) {
			return coords[0], coords[1]
		}
	}
	return 20.5937, 78.9629
}

type TrackingMoreTrackInfo struct {
	TrackingNumber string `json:"tracking_number"`
	CourierCode    string `json:"courier_code"`
	Status         string `json:"status"`
	OriginInfo     struct {
		Trackinfo []TrackingMoreEvent `json:"trackinfo"`
	} `json:"origin_info"`
	DestinationInfo struct {
		Trackinfo []TrackingMoreEvent `json:"trackinfo"`
	} `json:"destination_info"`
}

type TrackingMoreEvent struct {
	Date              string `json:"Date"`
	StatusDescription string `json:"StatusDescription"`
	Details           string `json:"Details"`
	CheckpointStatus  string `json:"checkpoint_status"`
}

type TrackingMoreResponse struct {
	Meta struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"meta"`
	Data struct {
		TrackInfo TrackingMoreTrackInfo `json:"track_info"`
	} `json:"data"`
}

type TrackingMoreDetectResponse struct {
	Meta struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"meta"`
	Data []struct {
		CourierCode string `json:"courier_code"`
		CourierName string `json:"courier_name"`
	} `json:"data"`
}

func tmStatusToOrderStatus(s string) models.OrderStatus {
	switch strings.ToLower(s) {
	case "transit", "intransit":
		return models.StatusInTransit
	case "pickup", "picked":
		return models.StatusPickedUp
	case "delivering", "outfordelivery":
		return models.StatusOutForDelivery
	case "delivered", "success":
		return models.StatusDelivered
	case "undelivered", "exception", "failed":
		return models.StatusDelayed
	case "inforeceived", "pending", "notfound":
		return models.StatusPlaced
	default:
		return models.StatusInTransit
	}
}

type RealTrackingResult struct {
	Events      []models.TrackingEvent
	Status      models.OrderStatus
	CourierName string
	OriginLat   float64
	OriginLng   float64
	DestLat     float64
	DestLng     float64
	CurrentLat  float64
	CurrentLng  float64
	Origin      string
	Destination string
}

func DetectCouriers(trackingNumber, apiKey string) ([]string, error) {
	urlStr := "https://api.trackingmore.com/v4/couriers/detect"
	payload := map[string]string{
		"tracking_number": trackingNumber,
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, urlStr, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Tracking-Api-Key", apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var detectResp TrackingMoreDetectResponse
	if err := json.Unmarshal(respBody, &detectResp); err != nil {
		return nil, err
	}

	log.Printf("trackingmore detect tracking=%s meta_code=%d meta_message=%s candidates=%d", trackingNumber, detectResp.Meta.Code, detectResp.Meta.Message, len(detectResp.Data))

	codes := make([]string, 0, len(detectResp.Data))
	for _, item := range detectResp.Data {
		if item.CourierCode != "" {
			codes = append(codes, strings.ToLower(item.CourierCode))
		}
	}
	return codes, nil
}

func createTracking(trackingNumber, courierCode, apiKey string) (*TrackingMoreResponse, error) {
	urlStr := "https://api.trackingmore.com/v4/trackings/create"
	payload := map[string]string{
		"tracking_number": trackingNumber,
		"courier_code":    courierCode,
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, urlStr, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Tracking-Api-Key", apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var tmResp TrackingMoreResponse
	if err := json.Unmarshal(respBody, &tmResp); err != nil {
		return nil, fmt.Errorf("parse create response: %w", err)
	}

	log.Printf("trackingmore create tracking=%s courier=%s http_status=%d meta_code=%d meta_message=%s", trackingNumber, courierCode, resp.StatusCode, tmResp.Meta.Code, tmResp.Meta.Message)

	return &tmResp, nil
}

func getExistingTracking(trackingNumber, courierCode, apiKey string) (*TrackingMoreResponse, error) {
	urlStr := fmt.Sprintf(
		"https://api.trackingmore.com/v4/trackings/get?tracking_number=%s&courier_code=%s",
		url.QueryEscape(trackingNumber),
		url.QueryEscape(courierCode),
	)
	req, err := http.NewRequest(http.MethodGet, urlStr, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Tracking-Api-Key", apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var tmResp TrackingMoreResponse
	if err := json.Unmarshal(respBody, &tmResp); err != nil {
		return nil, fmt.Errorf("parse get response: %w", err)
	}

	log.Printf("trackingmore get tracking=%s courier=%s http_status=%d meta_code=%d meta_message=%s", trackingNumber, courierCode, resp.StatusCode, tmResp.Meta.Code, tmResp.Meta.Message)
	return &tmResp, nil
}

func buildRealTrackingResult(tmResp *TrackingMoreResponse, trackingNumber string) (*RealTrackingResult, error) {
	trackInfo := tmResp.Data.TrackInfo
	allEvents := trackInfo.OriginInfo.Trackinfo
	if len(allEvents) == 0 {
		allEvents = trackInfo.DestinationInfo.Trackinfo
	}

	log.Printf("trackingmore build tracking=%s courier=%s events=%d", trackingNumber, trackInfo.CourierCode, len(allEvents))

	if len(allEvents) == 0 {
		return nil, fmt.Errorf("no tracking events found for %s", trackingNumber)
	}

	var events []models.TrackingEvent
	for i, e := range allEvents {
		location := e.Details
		if location == "" {
			location = "In transit"
		}
		if len(location) > 60 {
			location = location[:60]
		}

		lat, lng := getCoordsForLocation(location)
		t, _ := time.Parse("2006-01-02 15:04", e.Date)
		if t.IsZero() {
			t, _ = time.Parse(time.RFC3339, e.Date)
		}

		events = append(events, models.TrackingEvent{
			ID:        fmt.Sprintf("real-%d", i),
			Status:    string(tmStatusToOrderStatus(e.CheckpointStatus)),
			Location:  location,
			Lat:       lat,
			Lng:       lng,
			Note:      e.StatusDescription,
			CreatedAt: t,
		})
	}

	for i, j := 0, len(events)-1; i < j; i, j = i+1, j-1 {
		events[i], events[j] = events[j], events[i]
	}

	latestStatus := tmStatusToOrderStatus(trackInfo.Status)
	originEvent := allEvents[len(allEvents)-1]
	latestEvent := allEvents[0]

	originLoc := originEvent.Details
	if originLoc == "" {
		originLoc = "Origin"
	}
	destLoc := latestEvent.Details
	if destLoc == "" {
		destLoc = "Destination"
	}

	oLat, oLng := getCoordsForLocation(originLoc)
	dLat, dLng := getCoordsForLocation(destLoc)
	cLat, cLng := getCoordsForLocation(events[0].Location)

	return &RealTrackingResult{
		Events:      events,
		Status:      latestStatus,
		CourierName: trackInfo.CourierCode,
		Origin:      originLoc,
		Destination: destLoc,
		OriginLat:   oLat,
		OriginLng:   oLng,
		DestLat:     dLat,
		DestLng:     dLng,
		CurrentLat:  cLat,
		CurrentLng:  cLng,
	}, nil
}

func FetchRealTracking(trackingNumber, courierHint, apiKey string) (*RealTrackingResult, error) {
	seen := map[string]bool{}
	candidateCourierCodes := make([]string, 0)
	addCode := func(code string) {
		code = strings.TrimSpace(strings.ToLower(code))
		if code == "" || seen[code] {
			return
		}
		seen[code] = true
		candidateCourierCodes = append(candidateCourierCodes, code)
	}

	addCode(courierHint)

	detectedCodes, err := DetectCouriers(trackingNumber, apiKey)
	if err == nil {
		for _, code := range detectedCodes {
			addCode(code)
		}
	}

	for _, fallback := range []string{"delhivery", "shiprocket", "xpressbees", "dtdc", "bluedart", "fedex", "dhl"} {
		addCode(fallback)
	}

	var lastErr error
	for _, courierCode := range candidateCourierCodes {
		log.Printf("trackingmore attempt tracking=%s courier=%s", trackingNumber, courierCode)

		tmResp, err := createTracking(trackingNumber, courierCode, apiKey)
		if err != nil {
			log.Printf("trackingmore create failed tracking=%s courier=%s error=%v", trackingNumber, courierCode, err)
			lastErr = err
			continue
		}

		if tmResp.Meta.Code == 4101 {
			tmResp, err = getExistingTracking(trackingNumber, courierCode, apiKey)
			if err != nil {
				log.Printf("trackingmore get failed tracking=%s courier=%s error=%v", trackingNumber, courierCode, err)
				lastErr = err
				continue
			}
		}

		result, err := buildRealTrackingResult(tmResp, trackingNumber)
		if err != nil {
			log.Printf("trackingmore build failed tracking=%s courier=%s error=%v", trackingNumber, courierCode, err)
			lastErr = err
			continue
		}

		if result.CourierName == "" {
			result.CourierName = courierCode
		}
		log.Printf("trackingmore success tracking=%s resolved_courier=%s", trackingNumber, result.CourierName)
		return result, nil
	}

	if lastErr != nil {
		return nil, lastErr
	}

	return nil, fmt.Errorf("tracking info not found")
}
