FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -p=1 -o /traxr-server ./cmd/server

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /traxr-server /usr/local/bin/traxr-server
COPY .env.example .env

EXPOSE 8080

CMD ["traxr-server"]
