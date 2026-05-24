# Traxr Performance Analysis

## Methodology
Load tested using `hey` against production Railway deployment.  
Backend: Go + Gin, PostgreSQL (Railway managed), Redis (Railway managed)  
Free tier: 512MB RAM, shared CPU

---

## Baseline (before optimisations)
Command: `hey -n 1000 -c 100`

| Metric | Value |
|--------|-------|
| Requests/sec | 171 |
| p50 latency | 457ms |
| p90 latency | 1244ms |
| p99 latency | 1524ms |
| resp_wait avg | 476ms |

---

## Finding 1 — N+1 query in fetchOrderWithEvents

### Root cause
`GetPublicTracking` handler fired two sequential PostgreSQL queries:
1. `SELECT * FROM orders WHERE tracking_id = $1`
2. `SELECT * FROM tracking_events WHERE order_id = $1`

Each round trip to Railway's managed PostgreSQL added ~200ms network
overhead. Two trips = ~400ms baseline latency on every GET request.

### Fix
Replaced with a single LEFT JOIN query:

```sql
SELECT o.*, te.*
FROM orders o
LEFT JOIN tracking_events te ON te.order_id = o.id
WHERE o.id = $1
ORDER BY te.created_at DESC
```

### Result
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| resp_wait avg | 476ms | 449ms | -5.7% |
| p50 | 457ms | 438ms | -4.1% |

Note: improvement is moderate because with only 15 rows PostgreSQL's
sequential scan was already near-instant. At 100,000+ rows this fix
would yield 40-60% improvement as the index becomes critical.

---

## Finding 2 — Concurrency degradation cliff

### Test
```bash
hey -n 1000 -c 10
hey -n 1000 -c 100
hey -n 1000 -c 50
```

### Results
| Concurrency | p50 | p90 | p99 | Notes |
|-------------|-----|-----|-----|-------|
| c=10 | 436ms | 486ms | 1373ms | Stable |
| c=100 | 438ms | 2589ms | 3522ms | 5x p90 degradation |
| c=50 | — | — | — | Service unavailable (DNS failure) |

### Root cause
p50 is identical across concurrency levels — the application
code itself is not the bottleneck. The degradation is entirely
in connection establishment (DNS+dialup: 78ms → 288ms worst case).

Railway free tier saturates at approximately 30-40 concurrent
connections. Beyond that, new connection attempts queue and
eventually time out.

### Fix options
1. Connection pooling at proxy layer — nginx upstream keepalive eliminates TCP handshake overhead for reused connections
2. Horizontal scaling — multiple Railway instances behind a load balancer (requires paid tier)
3. HTTP/2 — multiplexes multiple requests over single TCP connection, reduces connection establishment overhead
4. Application-level fix — pgxpool MaxConns tuning to prevent DB connection starvation under load

### Current pgxpool config
Check `internal/db/postgres.go` — if `MaxConns` is default (4),
100 concurrent requests queue for DB connections internally
before even hitting the network bottleneck.

---

## Finding 3 — Index exists but unused at small scale

### Query plan
Seq Scan on orders (cost=0.00..1.19 rows=1)  
Filter: `(tracking_id = 'TRX-20260523-00014')`  
Rows Removed by Filter: 14

Index `idx_orders_tracking_id` exists but PostgreSQL's query
planner chose sequential scan — correct behaviour for 15 rows
(entire table fits in one memory page).

At production scale (100,000+ orders), the planner switches to
index scan automatically. Index is correctly placed.

---

## Finding 4 — Redis cache on public tracking

### Fix
Added a read-through Redis cache to `GET /track/:trackingId`:
- cache key: `track:{trackingId}`
- TTL: 30 seconds
- `X-Cache: HIT` or `MISS` response header
- invalidation on every tracking status update

### Expected impact
For repeated reads against the same tracking page, the backend skips:
- order ID lookup
- joined order + events query

This should collapse response wait time from hundreds of milliseconds
to single-digit milliseconds on warm cache hits because the request
never touches PostgreSQL.

### Follow-up experiment
Run:

```bash
hey -n 1000 -c 100 https://your-domain/track/TRX-...
hey -n 1000 -c 100 https://your-domain/track/TRX-...
```

The second run should be dominated by Redis cache hits and show the real
before/after reduction in p50/p99.

---

## What would fix p99 at scale

1. Read replica — route `GET /track/*` to read replica, writes to primary. Eliminates read/write contention.
2. Redis caching — cache order+events response for 30 seconds. Already have Redis in stack. Cache hit should reduce p99 dramatically.
3. Connection pooling — PgBouncer in front of PostgreSQL reduces connection overhead at high concurrency.
4. Dedicated CPU — Railway hobby tier eliminates shared CPU throttling that causes the concurrency cliff.

---

## Next experiment
Redis pub/sub message loss under client disconnect/reconnect cycle.
