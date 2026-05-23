package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"traxr-backend/internal/models"
)

const fallbackPrediction = "Prediction unavailable - tracking normally."

type AIService struct {
	apiKey string
	client *http.Client
}

func NewAIService(apiKey string) *AIService {
	return &AIService{
		apiKey: apiKey,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *AIService) PredictDelay(ctx context.Context, order models.Order, currentLocation string) string {
	if s.apiKey == "" {
		return fallbackPrediction
	}

	prompt := fmt.Sprintf(`You are a logistics AI. Analyze this shipment and predict delays.
Shipment details:

Route: %s to %s
Current status: %s
Current location: %s
Estimated delivery: %s
Weight: %.2fkg

Historical context:

Average delay on this route: 2-4 hours
Current conditions: moderate traffic, clear weather

Respond with ONLY a single sentence prediction. Be specific about time and cause.
Example: "Package expected on time - no disruptions detected on the NH-48 corridor."
Example: "High probability of 3-hour delay due to heavy congestion near Pune hub."`, order.Origin, order.Destination, order.Status, currentLocation, order.EstDelivery.Format(time.RFC3339), order.WeightKg)

	body := map[string]any{
		"contents": []map[string]any{
			{
				"parts": []map[string]string{
					{"text": prompt},
				},
			},
		},
	}

	payload, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key="+s.apiKey, bytes.NewReader(payload))
	if err != nil {
		return fallbackPrediction
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fallbackPrediction
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fallbackPrediction
	}

	var parsed struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return fallbackPrediction
	}

	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		return fallbackPrediction
	}

	text := strings.TrimSpace(parsed.Candidates[0].Content.Parts[0].Text)
	if text == "" {
		return fallbackPrediction
	}

	return text
}

func GenerateDelayPrediction(origin, destination, status, currentLocation, apiKey string) (string, error) {
	service := NewAIService(apiKey)
	order := models.Order{
		Origin:      origin,
		Destination: destination,
		Status:      models.OrderStatus(status),
		EstDelivery: time.Now().Add(24 * time.Hour),
		WeightKg:    0,
	}
	prediction := service.PredictDelay(context.Background(), order, currentLocation)
	return prediction, nil
}
