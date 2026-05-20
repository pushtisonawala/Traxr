"use client"

import { create } from "zustand"
import { Order, TrackingEvent, User } from "@/types"

interface TraxrState {
  currentOrder: Order | null
  trackingEvents: TrackingEvent[]
  isConnected: boolean
  user: User | null
  token: string | null
  setOrder: (order: Order | null, events?: TrackingEvent[]) => void
  addTrackingEvent: (event: TrackingEvent) => void
  setConnected: (connected: boolean) => void
  setUser: (user: User | null, token: string | null) => void
  logout: () => void
}

export const useTraxrStore = create<TraxrState>((set) => ({
  currentOrder: null,
  trackingEvents: [],
  isConnected: false,
  user: null,
  token: null,
  setOrder: (order, events = []) => set({ currentOrder: order, trackingEvents: events }),
  addTrackingEvent: (event) =>
    set((state) => {
      const exists = state.trackingEvents.some((item) => item.id === event.id)
      return exists ? state : { trackingEvents: [event, ...state.trackingEvents] }
    }),
  setConnected: (connected) => set({ isConnected: connected }),
  setUser: (user, token) => set({ user, token }),
  logout: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("traxr-token")
      window.localStorage.removeItem("traxr-user")
    }
    set({ user: null, token: null })
  }
}))
