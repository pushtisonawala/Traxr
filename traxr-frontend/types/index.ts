export interface Order {
  id: string
  tracking_id: string
  user_id: string
  customer_name: string
  customer_phone: string
  origin: string
  destination: string
  origin_lat: number
  origin_lng: number
  dest_lat: number
  dest_lng: number
  current_lat: number
  current_lng: number
  status: string
  weight_kg: number
  est_delivery: string
  ai_prediction: string
  is_real?: boolean
  courier?: string
  created_at: string
  updated_at: string
}

export interface TrackingEvent {
  id: string
  order_id: string
  status: string
  location: string
  lat: number
  lng: number
  note: string
  created_at: string
}

export interface OrderWithEvents extends Order {
  tracking_events: TrackingEvent[]
}

export interface User {
  id: string
  email: string
  name: string
}

export interface AuthResponse {
  token: string
  user: User
}
