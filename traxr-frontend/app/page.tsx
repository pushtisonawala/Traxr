"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { BellRing, BrainCircuit, Truck } from "lucide-react"
import { FormEvent, useState } from "react"

export default function LandingPage() {
  const [trackingID, setTrackingID] = useState("")
  const router = useRouter()

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (trackingID.trim()) {
      router.push(`/track/${trackingID.trim()}`)
    }
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex min-h-[90vh] max-w-6xl flex-col items-center justify-center">
        <div className="mb-12 text-center">
          <p className="mb-4 font-mono text-sm uppercase tracking-[0.32em] text-sky-300">Traxr</p>
          <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-tight text-white md:text-7xl">
            Track your shipments in real time.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            AI-powered delay predictions. Live map tracking. Instant status updates.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex w-full max-w-3xl flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur md:flex-row">
          <input
            value={trackingID}
            onChange={(event) => setTrackingID(event.target.value.toUpperCase())}
            placeholder="Enter tracking ID e.g. TRX-20240519-K2P8X"
            className="flex-1 rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-4 font-mono text-sm outline-none placeholder:text-slate-500"
          />
          <button type="submit" className="rounded-2xl bg-sky-500 px-6 py-4 font-medium text-slate-950 transition hover:bg-sky-400">
            Track shipment
          </button>
        </form>

        <div className="mt-12 grid w-full max-w-6xl gap-6 md:grid-cols-3">
          {[
            { icon: Truck, title: "Live tracking", text: "Real-time location updates via WebSocket" },
            { icon: BrainCircuit, title: "AI predictions", text: "Gemini-powered delay analysis" },
            { icon: BellRing, title: "Instant alerts", text: "Status changes pushed instantly" }
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <item.icon className="mb-4 text-sky-300" size={28} />
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
            </div>
          ))}
        </div>

        <Link href="/dashboard" className="mt-10 text-sm text-sky-300 transition hover:text-sky-200">
          Are you a seller? Sign in to your dashboard →
        </Link>
      </div>
    </main>
  )
}
