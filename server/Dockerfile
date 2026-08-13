FROM golang:1.25 AS base
WORKDIR /app
ARG GOPROXY_URL=https://proxy.golang.org|direct
ENV GOPROXY=${GOPROXY_URL}

COPY go.mod go.sum ./
RUN go mod download

FROM base AS dev
RUN apt-get update \
    && apt-get install -y --no-install-recommends webp \
    && rm -rf /var/lib/apt/lists/*
COPY . .
CMD ["go", "run", "./cmd/api/main.go"]

FROM base AS build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -mod=mod -o /bin/server ./cmd/api/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -mod=mod -o /bin/migrate ./cmd/migrate/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -mod=mod -o /bin/bloglinks ./cmd/bloglinks/main.go

FROM alpine:latest AS prod
WORKDIR /app
RUN apk add --no-cache ca-certificates libwebp-tools
COPY --from=build /bin/server /app/server
COPY --from=build /bin/migrate /app/migrate
COPY --from=build /bin/bloglinks /app/bloglinks
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:8080/health/ready >/dev/null || exit 1
CMD ["/app/entrypoint.sh"]
