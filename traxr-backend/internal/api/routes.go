package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"traxr-backend/internal/config"
	"traxr-backend/internal/services"
	"traxr-backend/internal/ws"
)

type Handler struct {
	DB     *pgxpool.Pool
	Redis  *redis.Client
	Hub    *ws.Hub
	Config config.Config
	AI     *services.AIService
}

func SetupRouter(handler *Handler) *gin.Engine {
	router := gin.Default()
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{handler.Config.AllowedOrigin},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	router.POST("/auth/register", handler.Register)
	router.POST("/auth/login", handler.Login)
	router.GET("/track/:trackingId", handler.GetPublicTracking)
	router.GET("/ws", handler.HandleWS)
	router.GET("/admin/orders", handler.AdminOrders)
	router.POST("/admin/seed", handler.ResetAndSeed)
	router.POST("/admin/simulate/:orderId", handler.AdminSimulate)

	auth := router.Group("/")
	auth.Use(handler.JWTMiddleware())
	auth.POST("/orders", handler.CreateOrder)
	auth.GET("/orders", handler.ListOrders)
	auth.GET("/orders/:id", handler.GetOrder)
	auth.POST("/tracking/:orderId/update", handler.UpdateTracking)

	return router
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func (h *Handler) HandleWS(c *gin.Context) {
	orderID := c.Query("order_id")
	if orderID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "order_id is required"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := ws.NewClient(conn, h.Hub, orderID)
	h.Hub.Register(client)
	go client.WritePump()
	go client.ReadPump()
}

func StartRedisSubscriber(ctx context.Context, redisClient *redis.Client, hub *ws.Hub) {
	pubsub := redisClient.PSubscribe(ctx, "order:*")
	ch := pubsub.Channel()

	go func() {
		for msg := range ch {
			orderID := strings.TrimPrefix(msg.Channel, "order:")
			var payload map[string]any
			if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
				log.Printf("redis subscriber: invalid payload: %v", err)
				continue
			}

			hub.BroadcastToRoom(orderID, ws.Message{
				OrderID: orderID,
				Type:    "status_update",
				Payload: payload,
			})
		}
	}()
}

func (h *Handler) publishOrder(ctx context.Context, orderID string, payload any) {
	data, _ := json.Marshal(payload)
	_ = h.Redis.Publish(ctx, "order:"+orderID, data).Err()
}
