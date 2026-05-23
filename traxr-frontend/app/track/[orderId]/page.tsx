"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import api from "@/lib/api"
import { useTraxrStore } from "@/lib/store"
import { wsClient } from "@/lib/websocket"
import { OrderWithEvents } from "@/types"
import { LiveBadge } from "@/components/LiveBadge"
import { StatusTimeline } from "@/components/StatusTimeline"
import AIPredictionCard from "@/components/AIPredictionCard"
import { TrackingMap } from "@/components/TrackingMap"
import ETAProgress from "@/components/ETAProgress"

type TrackPageResponse = OrderWithEvents | { success: boolean; data: OrderWithEvents }

export default function TrackPage({ params }: { params: { orderId: string } }) {
  const { currentOrder, trackingEvents, setOrder, isConnected, setConnected } = useTraxrStore()
  const [error, setError] = useState("")
  const [wsError, setWsError] = useState(false)
  const searchParams = useSearchParams()

  const normalizedOrderId = useMemo(() => params.orderId, [params.orderId])
  const isRealTracking = !normalizedOrderId.startsWith("TRX-")
  const courierHint = searchParams.get("courier") || ""

  useEffect(() => {
    let mounted = true

    async function loadOrder() {
      try {
        const query = isRealTracking && courierHint ? `?courier=${encodeURIComponent(courierHint)}` : ""
        const apiEndpoint = isRealTracking ? `/track/real/${normalizedOrderId}${query}` : `/track/${normalizedOrderId}`
        const response = await api.get<TrackPageResponse>(apiEndpoint)
        const order = "data" in response.data ? response.data.data : response.data
        if (!mounted) return
        setOrder(order, order.tracking_events)

        if (!order.is_real) {
          wsClient.connect(order.id, (message) => {
            if (message.type === "status_update") {
              const payload = message.payload as OrderWithEvents
              setOrder(payload, payload.tracking_events)
            }
          })
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Shipment not found.")
      }
    }

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ connected: boolean; error?: boolean }>).detail
      setConnected(detail.connected)
      setWsError(Boolean(detail.error))
    }

    window.addEventListener("traxr-ws-status", handler)
    loadOrder()

    return () => {
      mounted = false
      wsClient.disconnect()
      window.removeEventListener("traxr-ws-status", handler)
      setConnected(false)
    }
  }, [courierHint, isRealTracking, normalizedOrderId, setOrder, setConnected])

  if (error) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-500/20 bg-rose-500/10 p-8">
          <p className="text-lg text-rose-200">{error}</p>
          <Link href="/" className="mt-4 inline-block text-sky-300">Back to search</Link>
        </div>
      </main>
    )
  }

  if (!currentOrder) {
    return <main className="min-h-screen px-6 py-12 text-slate-300">Loading tracking data...</main>
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 px-6 py-4 md:flex-row md:items-center">
          <Link href="/" className="font-mono text-2xl font-bold">Traxr</Link>
          <div className="text-center">
            <p className="font-mono text-sm text-slate-300">{currentOrder.tracking_id}</p>
            {currentOrder.is_real && (
              <div style={{ fontSize: "11px", color: "#64748b", textAlign: "center", marginTop: "2px" }}>
                Live data via Trackingmore · {currentOrder.courier}
              </div>
            )}
          </div>
          <LiveBadge connected={currentOrder.is_real ? true : isConnected} error={currentOrder.is_real ? false : wsError} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[40%_60%]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Customer</p>
              <h1 className="mt-1 text-2xl font-semibold">{currentOrder.customer_name}</h1>
              <p className="mt-4 text-sm text-slate-300">{currentOrder.origin} → {currentOrder.destination}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-400">
                <div>
                  <p>Weight</p>
                  <p className="mt-1 text-white">{currentOrder.weight_kg.toFixed(2)} kg</p>
                </div>
                <div>
                  <p>Created</p>
                  <p className="mt-1 text-white">{new Date(currentOrder.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <ETAProgress order={currentOrder} />
            <AIPredictionCard prediction={currentOrder.ai_prediction} />
            <StatusTimeline events={trackingEvents} />
          </div>

          <TrackingMap
            origin={{ name: currentOrder.origin, lat: currentOrder.origin_lat, lng: currentOrder.origin_lng }}
            destination={{ name: currentOrder.destination, lat: currentOrder.dest_lat, lng: currentOrder.dest_lng }}
            current={{ lat: currentOrder.current_lat, lng: currentOrder.current_lng }}
          />
        </div>
      </div>
    </main>
  )
}
