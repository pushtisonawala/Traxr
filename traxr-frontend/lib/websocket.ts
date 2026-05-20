class TraxrWebSocket {
  private ws: WebSocket | null = null
  private orderID = ""
  private onMessage: ((data: any) => void) | null = null
  private reconnectAttempts = 0
  private maxReconnects = 5
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  connect(orderID: string, onMessage: (data: any) => void): void {
    this.orderID = orderID
    this.onMessage = onMessage
    const base = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"
    this.ws = new WebSocket(`${base}/ws?order_id=${orderID}`)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      window.dispatchEvent(new CustomEvent("traxr-ws-status", { detail: { connected: true } }))
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch {
        return
      }
    }

    this.ws.onerror = () => {
      window.dispatchEvent(new CustomEvent("traxr-ws-status", { detail: { connected: false, error: true } }))
    }

    this.ws.onclose = () => {
      window.dispatchEvent(new CustomEvent("traxr-ws-status", { detail: { connected: false } }))
      if (this.reconnectAttempts < this.maxReconnects) {
        const delay = 1000 * Math.pow(2, this.reconnectAttempts)
        this.reconnectAttempts += 1
        this.reconnectTimer = setTimeout(() => {
          if (this.orderID && this.onMessage) {
            this.connect(this.orderID, this.onMessage)
          }
        }, delay)
      }
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    this.ws?.close()
    this.ws = null
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const wsClient = new TraxrWebSocket()
