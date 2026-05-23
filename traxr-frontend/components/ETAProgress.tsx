"use client"

import { useEffect, useState } from "react"
import { Order } from "@/types"

const STATUS_PROGRESS: Record<string, number> = {
  placed: 0,
  picked_up: 20,
  in_transit: 50,
  out_for_delivery: 80,
  delivered: 100,
  delayed: 45,
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "overdue"
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `${days}d ${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`
  return `${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`
}

export default function ETAProgress({ order }: { order: Order }) {
  const [countdown, setCountdown] = useState("")
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now())
      const ms = new Date(order.est_delivery).getTime() - Date.now()
      setCountdown(formatCountdown(ms))
    }, 1000)
    return () => clearInterval(interval)
  }, [order.est_delivery])

  const progress = STATUS_PROGRESS[order.status] ?? 0
  const isDelivered = order.status === "delivered"
  const isOverdue = !isDelivered && new Date(order.est_delivery).getTime() < now
  const isDelayed = order.status === "delayed"

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "12px",
      padding: "20px 24px",
      marginBottom: "16px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>{order.origin}</span>
        <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>{order.destination}</span>
      </div>

      <div style={{ position: "relative", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", marginBottom: "8px" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${progress}%`,
          background: isDelayed ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "linear-gradient(90deg,#3b82f6,#10b981)",
          borderRadius: "3px",
          transition: "width 1s ease"
        }} />
        <div style={{
          position: "absolute",
          left: `calc(${progress}% - 10px)`,
          top: "-10px",
          fontSize: "18px",
          transition: "left 1s ease"
        }}>{"\uD83D\uDE9A"}</div>
      </div>

      <div style={{ textAlign: "center", marginTop: "18px" }}>
        {isDelivered ? (
          <div style={{ color: "#10b981", fontSize: "15px", fontWeight: 500 }}>
            {"\u2713"} Delivered
          </div>
        ) : isOverdue ? (
          <div>
            <div style={{ color: "#f59e0b", fontSize: "12px", marginBottom: "2px" }}>Delivery overdue</div>
            <div style={{ color: "#ef4444", fontSize: "22px", fontWeight: 600, fontFamily: "monospace" }}>
              {countdown.replace("-", "")} late
            </div>
          </div>
        ) : (
          <div>
            <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "4px" }}>
              {isDelayed ? "\u26A0 Estimated arrival (delayed)" : "Arrives in"}
            </div>
            <div style={{
              color: isDelayed ? "#f59e0b" : "#f1f5f9",
              fontSize: "28px",
              fontWeight: 600,
              fontFamily: "monospace",
              letterSpacing: "0.02em"
            }}>
              {countdown}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
