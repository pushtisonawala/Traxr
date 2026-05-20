package ws

import (
	"encoding/json"
	"sync"
)

type Hub struct {
	rooms      map[string]map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan Message
	mu         sync.RWMutex
}

type Message struct {
	OrderID string      `json:"order_id"`
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan Message, 32),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.rooms[client.orderID] == nil {
				h.rooms[client.orderID] = make(map[*Client]bool)
			}
			h.rooms[client.orderID][client] = true
			h.mu.Unlock()
		case client := <-h.unregister:
			h.mu.Lock()
			if room, ok := h.rooms[client.orderID]; ok {
				if _, exists := room[client]; exists {
					delete(room, client)
					close(client.send)
				}
				if len(room) == 0 {
					delete(h.rooms, client.orderID)
				}
			}
			h.mu.Unlock()
		case msg := <-h.broadcast:
			h.BroadcastToRoom(msg.OrderID, msg)
		}
	}
}

func (h *Hub) Register(client *Client) {
	h.register <- client
}

func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

func (h *Hub) Enqueue(msg Message) {
	h.broadcast <- msg
}

func (h *Hub) BroadcastToRoom(orderID string, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.mu.RLock()
	clients := h.rooms[orderID]
	h.mu.RUnlock()

	for client := range clients {
		select {
		case client.send <- data:
		default:
			h.unregister <- client
		}
	}
}
