"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { useTraxrStore } from "@/lib/store"
import { Navbar } from "@/components/Navbar"
import { CreateOrderModal } from "@/components/CreateOrderModal"
import { UpdateStatusModal } from "@/components/UpdateStatusModal"
import { Order, AuthResponse } from "@/types"

const statusStyles: Record<string, string> = {
  placed: "bg-slate-500/20 text-slate-200",
  picked_up: "bg-cyan-500/20 text-cyan-200",
  in_transit: "bg-sky-500/20 text-sky-200",
  out_for_delivery: "bg-indigo-500/20 text-indigo-200",
  delivered: "bg-emerald-500/20 text-emerald-200",
  delayed: "bg-rose-500/20 text-rose-200"
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, setUser } = useTraxrStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState("")
  const [sortDesc, setSortDesc] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [authForm, setAuthForm] = useState({ email: "demo@traxr.com", password: "demo1234", name: "Traxr Demo", mode: "login" })
  const [authError, setAuthError] = useState("")

  useEffect(() => {
    const storedToken = window.localStorage.getItem("traxr-token")
    const storedUser = window.localStorage.getItem("traxr-user")
    if (storedToken && storedUser && !user) {
      setUser(JSON.parse(storedUser), storedToken)
    }
  }, [setUser, user])

  useEffect(() => {
    const token = window.localStorage.getItem("traxr-token")
    if (!token) return

    api.get<Order[]>("/orders").then((response) => setOrders(response.data)).catch(() => {
      window.localStorage.removeItem("traxr-token")
      window.localStorage.removeItem("traxr-user")
    })
  }, [user])

  async function handleAuth() {
    try {
      setAuthError("")
      const path = authForm.mode === "login" ? "/auth/login" : "/auth/register"
      const response = await api.post<AuthResponse>(path, authForm)
      window.localStorage.setItem("traxr-token", response.data.token)
      window.localStorage.setItem("traxr-user", JSON.stringify(response.data.user))
      setUser(response.data.user, response.data.token)
      const ordersResponse = await api.get<Order[]>("/orders")
      setOrders(ordersResponse.data)
    } catch (err: any) {
      setAuthError(err.response?.data?.error || "Authentication failed")
    }
  }

  const filteredOrders = useMemo(() => {
    return [...orders]
      .filter((order) =>
        [order.tracking_id, order.customer_name].some((field) => field.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => sortDesc ? +new Date(b.created_at) - +new Date(a.created_at) : +new Date(a.created_at) - +new Date(b.created_at))
  }, [orders, search, sortDesc])

  const metrics = useMemo(() => {
    const total = orders.length
    const delivered = orders.filter((order) => order.status === "delivered").length
    const inTransit = orders.filter((order) => order.status === "in_transit" || order.status === "out_for_delivery").length
    const delayed = orders.filter((order) => order.status === "delayed").length
    return { total, delivered, inTransit, delayed }
  }, [orders])

  if (!user) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-3xl font-semibold">Seller access</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Sign in with the demo account or register a new seller profile.</p>
          <div className="mt-6 space-y-4">
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="Email" />
            {authForm.mode === "register" ? <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} placeholder="Name" /> : null}
            <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder="Password" />
            {authError ? <p className="text-sm text-rose-300">{authError}</p> : null}
            <div className="flex gap-3">
              <button onClick={handleAuth} className="rounded-full bg-sky-500 px-5 py-2.5 font-medium text-slate-950">
                {authForm.mode === "login" ? "Sign in" : "Register"}
              </button>
              <button onClick={() => setAuthForm({ ...authForm, mode: authForm.mode === "login" ? "register" : "login" })} className="rounded-full border border-white/10 px-5 py-2.5">
                Switch to {authForm.mode === "login" ? "register" : "login"}
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Navbar />

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5"><p className="text-sm text-slate-400">Total orders</p><p className="mt-2 text-3xl font-semibold">{metrics.total}</p></div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5"><p className="text-sm text-slate-400">Delivered</p><p className="mt-2 text-3xl font-semibold">{metrics.delivered}</p><p className="text-xs text-slate-500">{metrics.total ? Math.round((metrics.delivered / metrics.total) * 100) : 0}% success</p></div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5"><p className="text-sm text-slate-400">In transit</p><p className="mt-2 text-3xl font-semibold">{metrics.inTransit}</p></div>
          <div className={`rounded-3xl border p-5 ${metrics.delayed > 0 ? "border-rose-500/30 bg-rose-500/10" : "border-white/10 bg-white/5"}`}><p className="text-sm text-slate-400">Delayed</p><p className="mt-2 text-3xl font-semibold">{metrics.delayed}</p></div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3">
              <input className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm" placeholder="Search tracking ID or customer" value={search} onChange={(e) => setSearch(e.target.value)} />
              <button onClick={() => setSortDesc((prev) => !prev)} className="rounded-2xl border border-white/10 px-4 py-3 text-sm">
                Sort: {sortDesc ? "Newest" : "Oldest"}
              </button>
            </div>
            <button onClick={() => setModalOpen(true)} className="rounded-full bg-sky-500 px-5 py-3 text-sm font-medium text-slate-950">Create order</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-3">Tracking ID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Route</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Weight</th>
                  <th className="pb-3">Est. Delivery</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-t border-white/10 align-top">
                    <td className="py-4 font-mono text-sky-300">{order.tracking_id}</td>
                    <td className="py-4">{order.customer_name}</td>
                    <td className="py-4 text-slate-300">{order.origin} → {order.destination}</td>
                    <td className="py-4"><span className={`rounded-full px-3 py-1 text-xs ${statusStyles[order.status] || statusStyles.placed}`}>{order.status.replaceAll("_", " ")}</span></td>
                    <td className="py-4">{order.weight_kg} kg</td>
                    <td className="py-4 text-slate-300">{new Date(order.est_delivery).toLocaleDateString()}</td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <button onClick={() => window.open(`/track/${order.tracking_id}`, "_blank")} className="rounded-full border border-white/10 px-3 py-1.5 text-xs">View tracking</button>
                        <button onClick={() => setSelectedOrder(order)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs">Update status</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CreateOrderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(order) => setOrders((current) => [order, ...current])}
      />
      <UpdateStatusModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdated={(updated) => {
          setOrders((current) => current.map((order) => order.id === updated.id ? updated : order))
          setSelectedOrder(null)
        }}
      />
    </main>
  )
}
