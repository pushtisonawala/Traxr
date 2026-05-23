"use client"

import { useEffect, useRef } from "react"
import { TrackingEvent } from "@/types"

const colors: Record<string, string> = {
  delivered: "bg-emerald-500",
  in_transit: "bg-sky-500",
  out_for_delivery: "bg-indigo-500",
  delayed: "bg-amber-500",
  placed: "bg-slate-500",
  picked_up: "bg-cyan-500"
}

function humanize(status?: string) {
  return (status || "placed").replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase())
}

export function StatusTimeline({ events }: { events: TrackingEvent[] }) {
  const previousTopEventRef = useRef<string | null>(null)

  useEffect(() => {
    previousTopEventRef.current = events[0]?.id ?? null
  }, [events])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <style>{`
        @keyframes slideIn {
          0% { opacity: 0; transform: translateY(-12px); background: rgba(34,197,94,0.15); }
          100% { opacity: 1; transform: translateY(0); background: transparent; }
        }
      `}</style>
      <h3 className="mb-5 text-lg font-semibold">Shipment timeline</h3>
      <div className="space-y-5">
        {events.map((event, index) => {
          const isNewest = index === 0 && previousTopEventRef.current !== null && previousTopEventRef.current !== event.id
          return (
            <div
              key={event.id || `${event.status}-${event.created_at}-${index}`}
              className="flex gap-4 rounded-xl"
              style={isNewest ? { animation: "slideIn 300ms ease forwards" } : undefined}
            >
              <div className="flex flex-col items-center">
                <span className={`h-3.5 w-3.5 rounded-full ${colors[event.status] || "bg-slate-500"}`} />
                {index < events.length - 1 ? <span className="mt-1 h-full w-px bg-white/10" /> : null}
              </div>
              <div className="pb-2">
                <p className="text-sm font-medium text-white">{humanize(event.status)}</p>
                <p className="text-sm text-slate-300">{event.location}</p>
                <p className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}</p>
                {event.note ? <p className="mt-1 text-xs text-slate-400">{event.note}</p> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
