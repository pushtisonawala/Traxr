"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import api from "@/lib/api"
import { Order } from "@/types"

const statusOrder = ["placed", "picked_up", "in_transit", "out_for_delivery", "delivered"]

const statusStyles: Record<string, string> = {
  placed: "bg-slate-500/20 text-slate-200",
  picked_up: "bg-blue-500/20 text-blue-200",
  in_transit: "bg-cyan-500/20 text-cyan-200",
  out_for_delivery: "bg-amber-500/20 text-amber-200",
  delivered: "bg-emerald-500/20 text-emerald-200",
  delayed: "bg-rose-500/20 text-rose-200",
}

type SimulateResponse = {
  success: boolean
  data: {
    new_status: string
    location: string
    note: string
    order: Order
  }
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState("")
  const [log, setLog] = useState<string[]>([])
  const [isSimulating, setIsSimulating] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function loadOrders() {
    const response = await api.get<Order[]>("/admin/orders")
    setOrders(response.data)
    const nextOrder = response.data.find((order) => order.status !== "delivered")
    if (!selectedOrder && nextOrder) {
      setSelectedOrder(nextOrder.id)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  async function resetSeed() {
    await api.post("/admin/seed")
    await loadOrders()
    alert("Created 15 demo orders with demo@traxr.com / demo1234")
  }

  async function advanceStatus(orderId: string) {
    const response = await api.post<SimulateResponse>(`/admin/simulate/${orderId}`)
    const updatedOrder = response.data.data.order
    setOrders((current) => current.map((order) => order.id === orderId ? updatedOrder : order))
    setLog((current) => [
      `[${new Date().toLocaleTimeString()}] ${updatedOrder.tracking_id} → ${response.data.data.new_status}`,
      ...current
    ])
  }

  function copy(value: string) {
    navigator.clipboard.writeText(value)
  }

  function startSimulation() {
    if (!selectedOrder) return
    setIsSimulating(true)
    timerRef.current = setInterval(() => {
      const order = orders.find((item) => item.id === selectedOrder)
      if (!order || order.status === "delivered") {
        stopSimulation()
        return
      }
      advanceStatus(selectedOrder)
    }, 3000)
  }

  function stopSimulation() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsSimulating(false)
  }

  const progress = useMemo(() => {
    const order = orders.find((item) => item.id === selectedOrder)
    if (!order) return 0
    const index = statusOrder.indexOf(order.status)
    return { current: Math.max(index, 0) + 1, total: statusOrder.length, width: ((Math.max(index, 0) + 1) / statusOrder.length) * 100 }
  }, [orders, selectedOrder])

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="font-mono text-4xl font-bold">Demo Controls</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Simulate live shipments for demo</p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Demo credentials</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              { label: "Email", value: "demo@traxr.com" },
              { label: "Password", value: "demo1234" }
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <p className="font-mono text-sm text-slate-100">{item.value}</p>
                  <button onClick={() => copy(item.value)} className="rounded-full border border-white/10 px-3 py-1 text-xs">
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Orders table</h2>
            <button onClick={resetSeed} className="rounded-full bg-sky-500 px-5 py-3 text-sm font-medium text-slate-950">
              Reset & seed demo data
            </button>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-3">Tracking ID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Route</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-white/10">
                    <td className="py-4 font-mono text-sky-300">{order.tracking_id}</td>
                    <td className="py-4">{order.customer_name}</td>
                    <td className="py-4">{order.origin} → {order.destination}</td>
                    <td className="py-4">
                      <span className={`rounded-full px-3 py-1 text-xs ${statusStyles[order.status] || statusStyles.placed}`}>
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <button onClick={() => advanceStatus(order.id)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs">
                          Advance ▶
                        </button>
                        <button onClick={() => window.open(`/track/${order.tracking_id}`, "_blank")} className="rounded-full border border-white/10 px-3 py-1.5 text-xs">
                          Open tracking
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Live journey simulator</h2>
          <div className="mt-5 flex flex-col gap-4 md:flex-row">
            <select className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3" value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)}>
              {orders.filter((order) => order.status !== "delivered").map((order) => (
                <option key={order.id} value={order.id}>
                  {order.tracking_id} · {order.origin} → {order.destination}
                </option>
              ))}
            </select>
            {!isSimulating ? (
              <button onClick={startSimulation} className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-medium text-slate-950">▶ Start</button>
            ) : (
              <button onClick={stopSimulation} className="rounded-full bg-rose-500 px-5 py-3 text-sm font-medium text-white">⏹ Stop</button>
            )}
          </div>
          <div className="mt-4 text-sm text-slate-400">Step {progress.current} of {progress.total}</div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all" style={{ width: `${progress.width}%` }} />
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="mb-3 text-sm font-medium text-slate-300">Live log</p>
            <div className="space-y-2 text-sm text-slate-400">
              {log.length === 0 ? <p>No simulation events yet.</p> : log.map((entry) => <p key={entry}>{entry}</p>)}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
