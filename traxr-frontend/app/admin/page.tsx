"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import api from "@/lib/api"
import { Order } from "@/types"

const statusOrder = ["placed", "picked_up", "in_transit", "out_for_delivery", "delivered"]

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState("")
  const [log, setLog] = useState<string[]>([])
  const [isSimulating, setIsSimulating] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function loadOrders() {
    const response = await api.get<Order[]>("/admin/orders")
    setOrders(response.data)
    if (!selectedOrder && response.data[0]) {
      setSelectedOrder(response.data[0].id)
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
    const response = await api.post<Order>(`/admin/simulate/${orderId}`)
    setOrders((current) => current.map((order) => order.id === orderId ? response.data : order))
    setLog((current) => [`${new Date().toLocaleTimeString()}: ${response.data.tracking_id} → ${response.data.status}`, ...current])
  }

  function copyTrackingLink(trackingID: string) {
    navigator.clipboard.writeText(`${window.location.origin}/track/${trackingID}`)
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
    return ((Math.max(index, 0) + 1) / statusOrder.length) * 100
  }, [orders, selectedOrder])

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="font-mono text-4xl font-bold">Traxr demo controls</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Seed the environment, advance order journeys, and simulate a live route for interviews and demos.</p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Seed data</h2>
          <button onClick={resetSeed} className="mt-4 rounded-full bg-sky-500 px-5 py-3 text-sm font-medium text-slate-950">
            Reset & seed demo data
          </button>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">All orders table</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-3">Tracking ID</th>
                  <th className="pb-3">Route</th>
                  <th className="pb-3">Current status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-white/10">
                    <td className="py-4 font-mono text-sky-300">{order.tracking_id}</td>
                    <td className="py-4">{order.origin} → {order.destination}</td>
                    <td className="py-4">{order.status.replaceAll("_", " ")}</td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <button onClick={() => advanceStatus(order.id)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs">Advance status</button>
                        <button onClick={() => copyTrackingLink(order.tracking_id)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs">Copy tracking link</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Simulate live journey</h2>
          <div className="mt-5 flex flex-col gap-4 md:flex-row">
            <select className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3" value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)}>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.tracking_id} · {order.origin} → {order.destination}
                </option>
              ))}
            </select>
            {!isSimulating ? (
              <button onClick={startSimulation} className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-medium text-slate-950">Start simulation</button>
            ) : (
              <button onClick={stopSimulation} className="rounded-full bg-rose-500 px-5 py-3 text-sm font-medium text-white">Stop simulation</button>
            )}
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all" style={{ width: `${progress}%` }} />
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
