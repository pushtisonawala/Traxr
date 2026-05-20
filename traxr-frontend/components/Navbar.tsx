"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useTraxrStore } from "@/lib/store"

export function Navbar() {
  const { user, logout } = useTraxrStore()
  const initials = useMemo(() => {
    if (!user) return "TR"
    return user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }, [user])

  return (
    <header className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur">
      <Link href="/" className="font-mono text-2xl font-bold tracking-tight">
        Traxr
      </Link>
      {user ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20 text-sm font-semibold text-sky-200">
              {initials}
            </div>
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
          <button onClick={logout} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">
            Logout
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <Link href="/" className="hover:text-white">Sign in</Link>
          <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
        </div>
      )}
    </header>
  )
}
