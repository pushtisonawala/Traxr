"use client"

import { useEffect, useMemo, useRef } from "react"
import L from "leaflet"
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet"

const pulsingIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:20px;height:20px;">
      <div style="
        position:absolute;width:20px;height:20px;border-radius:50%;
        background:rgba(59,130,246,0.3);
        animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
      "></div>
      <div style="
        position:absolute;top:4px;left:4px;width:12px;height:12px;
        border-radius:50%;background:#3b82f6;border:2px solid white;
      "></div>
    </div>
    <style>
      @keyframes ping {
        0%{transform:scale(1);opacity:0.8}
        100%{transform:scale(2.5);opacity:0}
      }
    </style>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
})

const staticMarker = (color: string) =>
  new L.DivIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${color};border:3px solid rgba(255,255,255,.92)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  })

type Props = {
  origin: { name: string; lat: number; lng: number }
  destination: { name: string; lat: number; lng: number }
  current: { lat: number; lng: number }
}

function MovingCurrentMarker({ current }: { current: { lat: number; lng: number } }) {
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([current.lat, current.lng])
    }
  }, [current.lat, current.lng])

  return (
    <Marker
      position={[current.lat, current.lng]}
      icon={pulsingIcon}
      ref={(marker) => {
        markerRef.current = marker as unknown as L.Marker | null
      }}
    >
      <Popup>Current shipment position</Popup>
    </Marker>
  )
}

function FitMapBounds({ origin, destination, current }: Props) {
  const map = useMap()

  useEffect(() => {
    const bounds = L.latLngBounds([
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
      [current.lat, current.lng]
    ])
    map.fitBounds(bounds, { padding: [80, 80] })
  }, [origin, destination, current, map])

  return null
}

export default function TrackingMapInner({ origin, destination, current }: Props) {
  const polylinePositions = useMemo(() => ([
    [origin.lat, origin.lng],
    [current.lat, current.lng],
    [destination.lat, destination.lng]
  ]), [origin, current, destination])

  return (
    <div className="min-h-[450px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50 p-2">
      <MapContainer center={[current.lat, current.lng]} zoom={5} scrollWheelZoom className="min-h-[450px]">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[origin.lat, origin.lng]} icon={staticMarker("#22c55e")}>
          <Popup>{origin.name}</Popup>
        </Marker>
        <Marker position={[destination.lat, destination.lng]} icon={staticMarker("#ef4444")}>
          <Popup>{destination.name}</Popup>
        </Marker>
        <MovingCurrentMarker current={current} />
        <Polyline
          positions={polylinePositions}
          pathOptions={{ color: "#38bdf8", dashArray: "6 10", weight: 3 }}
        />
        <FitMapBounds origin={origin} destination={destination} current={current} />
      </MapContainer>
    </div>
  )
}
