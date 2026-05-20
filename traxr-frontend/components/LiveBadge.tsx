"use client"

type Props = {
  connected: boolean
  error?: boolean
}

export function LiveBadge({ connected, error }: Props) {
  const tone = error ? "bg-rose-500 text-rose-300" : connected ? "bg-emerald-500 text-emerald-300" : "bg-slate-500 text-slate-300"
  const label = error ? "Disconnected" : connected ? "Live" : "Reconnecting..."

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${tone} ${connected ? "animate-pulseDot" : ""}`} />
      <span className={connected ? "text-emerald-300" : error ? "text-rose-300" : "text-slate-300"}>{label}</span>
    </div>
  )
}
