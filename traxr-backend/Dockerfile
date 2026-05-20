FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /traxr-server ./cmd/server

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /traxr-server /usr/local/bin/traxr-server
COPY .env.example .env

EXPOSE 8080

CMD ["traxr-server"]
