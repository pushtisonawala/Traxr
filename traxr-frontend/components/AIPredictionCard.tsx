import { BrainCircuit } from "lucide-react"

type Props = {
  prediction: string
  updatedAt: string
}

export function AIPredictionCard({ prediction, updatedAt }: Props) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-sky-500/60 via-indigo-500/50 to-fuchsia-500/60 p-[1px]">
      <div className="rounded-2xl bg-slate-950/90 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-sky-500/15 p-2 text-sky-300">
            <BrainCircuit size={20} />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">AI Prediction</p>
            <p className="text-xs text-slate-500">Updated {new Date(updatedAt).toLocaleString()}</p>
          </div>
        </div>
        {prediction ? (
          <p className="text-sm leading-7 text-slate-100">{prediction}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-slate-300">Generating prediction...</p>
            <div className="h-2 rounded-full bg-[length:200%_100%] bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 animate-shimmer" />
          </div>
        )}
      </div>
    </div>
  )
}
