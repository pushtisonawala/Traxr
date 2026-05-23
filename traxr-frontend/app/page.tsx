"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { BellRing, BrainCircuit, Truck } from "lucide-react"
import { FormEvent, useState } from "react"

const courierOptions = [
  { label: "Auto-detect", value: "" },
  { label: "Delhivery", value: "delhivery" },
  { label: "Shiprocket", value: "shiprocket" },
  { label: "Bluedart", value: "bluedart" },
  { label: "DTDC", value: "dtdc" },
  { label: "XpressBees", value: "xpressbees" },
  { label: "FedEx", value: "fedex" },
  { label: "DHL", value: "dhl" }
]

export default function LandingPage() {
  const [trackingID, setTrackingID] = useState("")
  const [courierHint, setCourierHint] = useState("")
  const router = useRouter()

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!trackingID.trim()) return

    const normalized = trackingID.trim()
    if (normalized.startsWith("TRX-")) {
      router.push(`/track/${normalized}`)
      return
    }

    const query = courierHint ? `?courier=${encodeURIComponent(courierHint)}` : ""
    router.push(`/track/${normalized}${query}`)
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

        <form onSubmit={onSubmit} className="flex w-full max-w-3xl flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row">
            <input
              value={trackingID}
              onChange={(event) => setTrackingID(event.target.value.toUpperCase())}
              placeholder="Enter any tracking ID - Bluedart, Delhivery, DTDC and more"
              className="flex-1 rounded-2xl border border-white/10 bg-slate-950/50 px-5 py-4 font-mono text-sm outline-none placeholder:text-slate-500"
            />
            <button type="submit" className="rounded-2xl bg-sky-500 px-6 py-4 font-medium text-slate-950 transition hover:bg-sky-400">
              Track shipment
            </button>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Courier hint</label>
            <select
              value={courierHint}
              onChange={(event) => setCourierHint(event.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200 outline-none"
            >
              {courierOptions.map((option) => (
                <option key={option.label} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500">Use this if auto-detect misses the courier.</p>
          </div>
        </form>

        <p style={{ fontSize: "13px", color: "#64748b", marginTop: "8px", textAlign: "center" }}>
          Works with 900+ couriers worldwide - or try demo ID: TRX-20260523-DEMO1
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {["Bluedart", "Delhivery", "DTDC", "Ecom Express", "FedEx", "DHL", "1200+ more"].map((courier) => (
            <span key={courier} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
              {courier}
            </span>
          ))}
        </div>

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
