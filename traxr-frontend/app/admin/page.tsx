"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import api from "@/lib/api"
import { Order } from "@/types"

const statusStyles: Record<string, string> = {
  placed: "bg-slate-500/20 text-slate-200 border-slate-500/40",
  picked_up: "bg-blue-500/20 text-blue-200 border-blue-500/40",
  in_transit: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
  out_for_delivery: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  delivered: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  delayed: "bg-rose-500/20 text-rose-200 border-rose-500/40",
}

type SimulateResponse = {
  success?: boolean
  data?: {
    new_status?: string
    location?: string
    note?: string
    order?: Partial<Order>
  }
} & Partial<Order>

type Toast = {
  id: string
  message: string
}

function normalizeOrder(order: Partial<Order> | undefined): Order | null {
  if (!order?.id || !order?.tracking_id) return null
  return {
    id: order.id,
    tracking_id: order.tracking_id,
    user_id: order.user_id || "",
    customer_name: order.customer_name || "Unknown customer",
    customer_phone: order.customer_phone || "",
    origin: order.origin || "Unknown origin",
    destination: order.destination || "Unknown destination",
    origin_lat: Number(order.origin_lat || 0),
    origin_lng: Number(order.origin_lng || 0),
    dest_lat: Number(order.dest_lat || 0),
    dest_lng: Number(order.dest_lng || 0),
    current_lat: Number(order.current_lat || 0),
    current_lng: Number(order.current_lng || 0),
    status: order.status || "placed",
    weight_kg: Number(order.weight_kg || 0),
    est_delivery: order.est_delivery || new Date().toISOString(),
    ai_prediction: order.ai_prediction || "",
    created_at: order.created_at || new Date().toISOString(),
    updated_at: order.updated_at || new Date().toISOString(),
    is_real: order.is_real,
    courier: order.courier,
  }
}

function humanizeStatus(status?: string) {
  return (status || "placed").replaceAll("_", " ")
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const logTopRef = useRef<HTMLDivElement | null>(null)

  async function loadOrders() {
    const response = await api.get<Order[]>("/admin/orders")
    const normalized = response.data.map((order) => normalizeOrder(order)).filter(Boolean) as Order[]
    setOrders(normalized)
  }

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    if (logTopRef.current) {
      logTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [log])

  function showToast(message: string) {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((current) => [{ id, message }, ...current])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3000)
  }

  async function advanceStatus(orderId: string) {
    try {
      setUpdatingId(orderId)
      const response = await api.post<SimulateResponse>(`/admin/simulate/${orderId}`)
      const rawOrder = response.data?.data?.order || response.data
      const updatedOrder = normalizeOrder(rawOrder)
      if (!updatedOrder) {
        await loadOrders()
        return
      }

      setOrders((current) => current.map((order) => order.id === orderId ? updatedOrder : order))
      setSuccessId(orderId)
      const nextStatus = response.data?.data?.new_status || updatedOrder.status
      const logLine = `[${new Date().toLocaleTimeString()}] ${updatedOrder.tracking_id} → ${nextStatus} ✓`
      setLog((current) => [logLine, ...current])
      showToast(`📦 ${updatedOrder.tracking_id} advanced to ${nextStatus}`)
      window.setTimeout(() => setSuccessId((current) => current === orderId ? null : current), 1000)
    } finally {
      setUpdatingId(null)
    }
  }

  const activeOrders = useMemo(() => orders.filter((order) => order.status !== "delivered").slice(0, 5), [orders])

  return (
    <main className="min-h-screen bg-[#060b16] px-6 py-10 font-mono text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center gap-3 border-b border-white/10 pb-6">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.9)]" />
          <div>
            <h1 className="text-4xl font-bold tracking-[0.2em]">LIVE DEMO CONTROL</h1>
            <p className="mt-2 text-sm text-slate-400">Mission control for real-time shipment simulation</p>
          </div>
        </div>

        <div className="fixed right-6 top-6 z-50 space-y-3">
          {toasts.map((toast) => (
            <div key={toast.id} className="rounded-2xl border border-sky-500/30 bg-slate-950/95 px-4 py-3 text-sm text-sky-200 shadow-2xl">
              {toast.message}
            </div>
          ))}
        </div>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
          <h2 className="text-2xl font-semibold tracking-[0.12em]">Select shipment to simulate</h2>
          <p className="mt-2 text-sm text-slate-400">Advance any active shipment and watch public tracking pages update live.</p>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {activeOrders.map((order) => {
              const isUpdating = updatingId === order.id
              const isSuccess = successId === order.id
              return (
                <div key={order.id} className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.55)]">
                  <p className="text-sm text-slate-500">Tracking ID</p>
                  <p className="mt-2 text-lg text-sky-300">{order.tracking_id}</p>
                  <p className="mt-4 text-sm text-slate-400">Route</p>
                  <p className="mt-2 text-base text-slate-100">{order.origin} → {order.destination}</p>
                  <div className="mt-5">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusStyles[order.status] || statusStyles.placed}`}>
                      {humanizeStatus(order.status)}
                    </span>
                  </div>
                  <button
                    onClick={() => advanceStatus(order.id)}
                    disabled={isUpdating}
                    className={`mt-6 flex w-full items-center justify-center rounded-2xl px-4 py-4 text-sm font-semibold tracking-[0.18em] transition ${
                      isSuccess
                        ? "bg-emerald-500 text-slate-950"
                        : isUpdating
                          ? "bg-sky-500/70 text-slate-950"
                          : "bg-sky-500 text-slate-950 hover:bg-sky-400"
                    }`}
                  >
                    {isUpdating ? "Updating..." : isSuccess ? "✓ Done" : "▶ ADVANCE"}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-black/40 p-6">
          <h2 className="text-xl font-semibold tracking-[0.16em]">Live event log</h2>
          <div className="mt-4 h-[200px] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-emerald-300">
            <div ref={logTopRef} />
            {log.length === 0 ? (
              <p className="text-slate-500">No events yet. Advance a shipment to start the log.</p>
            ) : (
              log.map((entry) => (
                <p key={entry} className="mb-2 last:mb-0">{entry}</p>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
