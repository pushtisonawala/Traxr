"use client"

import { useEffect } from "react"
import L from "leaflet"
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet"

const pulseIcon = new L.DivIcon({
  className: "",
  html: `<div class="map-pulse-marker"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
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

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()

  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 1.2 })
  }, [lat, lng, map])

  return null
}

export default function TrackingMapInner({ origin, destination, current }: Props) {
  return (
    <div className="min-h-[450px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50 p-2">
      <MapContainer center={[current.lat, current.lng]} zoom={5} scrollWheelZoom className="min-h-[450px]">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[origin.lat, origin.lng]} icon={staticMarker("#22c55e")}>
          <Popup>{origin.name}</Popup>
        </Marker>
        <Marker position={[destination.lat, destination.lng]} icon={staticMarker("#ef4444")}>
          <Popup>{destination.name}</Popup>
        </Marker>
        <Marker position={[current.lat, current.lng]} icon={pulseIcon}>
          <Popup>Current shipment position</Popup>
        </Marker>
        <Polyline
          positions={[
            [origin.lat, origin.lng],
            [current.lat, current.lng],
            [destination.lat, destination.lng]
          ]}
          pathOptions={{ color: "#38bdf8", dashArray: "6 10", weight: 3 }}
        />
        <Recenter lat={current.lat} lng={current.lng} />
      </MapContainer>
    </div>
  )
}
