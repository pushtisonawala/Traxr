"use client"

import dynamic from "next/dynamic"

const LazyMap = dynamic(() => import("./TrackingMapInner"), { ssr: false })

type Props = {
  origin: { name: string; lat: number; lng: number }
  destination: { name: string; lat: number; lng: number }
  current: { lat: number; lng: number }
}

export function TrackingMap(props: Props) {
  return <LazyMap {...props} />
}
