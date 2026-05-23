"use client"

import { FormEvent, useMemo, useState } from "react"
import api from "@/lib/api"
import { Order } from "@/types"

const statusOptions = [
  "placed",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delayed",
  "delivered"
]

const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 }
}

type Props = {
  order: Order | null
  onClose: () => void
  onUpdated: (order: Order) => void
}

export function UpdateStatusModal({ order, onClose, onUpdated }: Props) {
  const [status, setStatus] = useState(order?.status || "in_transit")
  const [location, setLocation] = useState(order?.destination || "")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")

  const coordinates = useMemo(() => {
    const from = order ? { lat: order.current_lat, lng: order.current_lng } : { lat: 0, lng: 0 }
    const target = order ? cityCoordinates[order.destination] || from : from
    if (status === "delivered") return target
    if (status === "placed") return order ? { lat: order.origin_lat, lng: order.origin_lng } : from
    return {
      lat: Number((from.lat + (target.lat - from.lat) * 0.35).toFixed(4)),
      lng: Number((from.lng + (target.lng - from.lng) * 0.35).toFixed(4))
    }
  }, [order, status])

  if (!order) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!order) {
      return
    }
    try {
      setError("")
      const response = await api.post<Order>(`/tracking/${order.id}/update`, {
        status,
        location,
        lat: coordinates.lat,
        lng: coordinates.lng,
        note
      })
      onUpdated(response.data)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update shipment.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold">Update shipment status</h3>
            <p className="mt-1 font-mono text-sm text-sky-300">{order.tracking_id}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">Close</button>
        </div>
        <div className="space-y-4">
          <select className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3" value={status} onChange={(e) => setStatus(e.target.value)}>
            {statusOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
          <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" required />
          <textarea className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Operational note" />
          <p className="text-xs text-slate-500">Marker update will move to {coordinates.lat}, {coordinates.lng}</p>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-5 py-2.5 text-sm">Cancel</button>
          <button type="submit" className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-medium text-slate-950">Save update</button>
        </div>
      </form>
    </div>
  )
}
