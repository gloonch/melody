FROM golang:1.25-alpine AS base
WORKDIR /app
ENV GOPROXY=direct
ENV GOSUMDB=off

RUN apk add --no-cache git ca-certificates
RUN printf '%s\n' \
    '#!/bin/sh' \
    'set -eu' \
    'go mod edit -replace=golang.org/x/arch=github.com/golang/arch@v0.8.0' \
    'go mod edit -replace=golang.org/x/crypto=github.com/golang/crypto@v0.26.0' \
    'go mod edit -replace=golang.org/x/net=github.com/golang/net@v0.25.0' \
    'go mod edit -replace=golang.org/x/sync=github.com/golang/sync@v0.17.0' \
    'go mod edit -replace=golang.org/x/sys=github.com/golang/sys@v0.26.0' \
    'go mod edit -replace=golang.org/x/text=github.com/golang/text@v0.29.0' \
    'go mod edit -replace=google.golang.org/protobuf=github.com/protocolbuffers/protobuf-go@v1.34.1' \
    > /usr/local/bin/apply-go-replaces && chmod +x /usr/local/bin/apply-go-replaces
COPY go.mod go.sum ./
RUN apply-go-replaces && go mod download

FROM base AS dev
COPY . .
CMD ["go", "run", "./cmd/api/main.go"]

FROM base AS build
COPY . .
RUN apply-go-replaces && go mod tidy && CGO_ENABLED=0 GOOS=linux go build -mod=mod -o /bin/server ./cmd/api/main.go

FROM alpine:latest AS prod
WORKDIR /app
COPY --from=build /bin/server /app/server
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
EXPOSE 8080
CMD ["/app/entrypoint.sh"]
