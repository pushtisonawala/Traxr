"use client"

import { FormEvent, useMemo, useState } from "react"
import api from "@/lib/api"
import { Order } from "@/types"

const cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"]

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (order: Order) => void
}

export function CreateOrderModal({ open, onClose, onCreated }: Props) {
  const tomorrow = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    return date.toISOString().split("T")[0]
  }, [])

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    origin: "Mumbai",
    destination: "Delhi",
    weight_kg: "5",
    est_delivery: tomorrow
  })
  const [error, setError] = useState("")

  if (!open) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    if (form.origin === form.destination) {
      setError("Origin and destination must be different.")
      return
    }

    try {
      const response = await api.post<Order>("/orders", {
        ...form,
        weight_kg: Number(form.weight_kg),
        est_delivery: new Date(form.est_delivery).toISOString()
      })
      onCreated(response.data)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create order.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold">Create shipment</h3>
            <p className="text-sm text-slate-400">Set up a new shipment and generate a public tracking ID.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">Close</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3" placeholder="Customer name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3" placeholder="Customer phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          <select className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })}>
            {cities.map((city) => <option key={city}>{city}</option>)}
          </select>
          <select className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })}>
            {cities.map((city) => <option key={city}>{city}</option>)}
          </select>
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3" type="number" min="0.1" step="0.1" placeholder="Weight in kg" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3" type="date" min={tomorrow} value={form.est_delivery} onChange={(e) => setForm({ ...form, est_delivery: e.target.value })} />
        </div>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-5 py-2.5 text-sm">Cancel</button>
          <button type="submit" className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-medium text-slate-950">Create order</button>
        </div>
      </form>
    </div>
  )
}
