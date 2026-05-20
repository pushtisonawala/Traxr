import { Order } from "@/types"

export function OrderCard({ order }: { order: Order }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="font-mono text-sm text-sky-300">{order.tracking_id}</p>
      <p className="mt-2 text-lg font-semibold">{order.customer_name}</p>
      <p className="text-sm text-slate-400">{order.origin} to {order.destination}</p>
    </div>
  )
}
