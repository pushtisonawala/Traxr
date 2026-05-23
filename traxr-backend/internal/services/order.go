package services

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"time"
)

const trackingAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func GenerateTrackingID(ctx context.Context, exists func(context.Context, string) (bool, error)) (string, error) {
	for i := 0; i < 10; i++ {
		candidate, err := randomTrackingID()
		if err != nil {
			return "", err
		}

		ok, err := exists(ctx, candidate)
		if err != nil {
			return "", err
		}
		if !ok {
			return candidate, nil
		}
	}

	return "", fmt.Errorf("could not generate unique tracking ID")
}

func randomTrackingID() (string, error) {
	suffix := make([]byte, 5)
	for i := range suffix {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(trackingAlphabet))))
		if err != nil {
			return "", err
		}
		suffix[i] = trackingAlphabet[n.Int64()]
	}

	return fmt.Sprintf("TRX-%s-%s", time.Now().Format("20060102"), string(suffix)), nil
}

func GenerateTrackingIDNoCheck() (string, error) {
	return randomTrackingID()
}
