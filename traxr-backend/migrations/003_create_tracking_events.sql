CREATE TABLE tracking_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID REFERENCES orders(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  location    TEXT NOT NULL,
  lat         FLOAT NOT NULL,
  lng         FLOAT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tracking_events_order_id ON tracking_events(order_id);
CREATE INDEX idx_orders_tracking_id ON orders(tracking_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
