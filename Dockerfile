# ==========================================
# Stage 1: Build Frontend (React + TypeScript)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /build/web

# Copy package manifests for layer caching
COPY web/package.json web/package-lock.json* ./
RUN npm install

# Copy frontend source and compile static distribution
COPY web/ ./
RUN npm run build

# ==========================================
# Stage 2: Build Backend (Go Binary)
# ==========================================
FROM golang:alpine AS backend-builder
WORKDIR /build

ENV GOTOOLCHAIN=auto

# Install git/certs if needed
RUN apk add --no-cache ca-certificates tzdata

# Copy Go dependency manifests for caching
COPY go.mod go.sum ./
RUN go mod download

# Copy backend source
COPY cmd/ cmd/
COPY internal/ internal/
COPY migrations/ migrations/

# Build statically linked standalone binary (CGO_ENABLED=0 with pure-Go modernc.org/sqlite)
ARG VERSION=1.0.0
ARG COMMIT=docker
ARG BUILD_DATE=""
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w -X main.Version=${VERSION} -X main.Commit=${COMMIT} -X main.BuildDate=${BUILD_DATE}" \
    -o /bin/cms ./cmd/server

# ==========================================
# Stage 3: Minimal, Secure Runtime Image
# ==========================================
FROM alpine:3.20 AS runtime

# Install basic trusted certs and timezone data
RUN apk add --no-cache ca-certificates tzdata

# Create dedicated non-root user and group
RUN addgroup -g 10001 cms && \
    adduser -u 10001 -G cms -s /sbin/nologin -D cms

# Prepare application directories
WORKDIR /app
RUN mkdir -p /app/data /app/web/dist && \
    chown -R cms:cms /app

# Copy compiled backend binary
COPY --from=backend-builder --chown=cms:cms /bin/cms /app/cms

# Copy compiled frontend static assets
COPY --from=frontend-builder --chown=cms:cms /build/web/dist /app/web/dist

# Switch to unprivileged non-root user
USER cms

# Set default container environment
ENV CMS_HOST=0.0.0.0 \
    CMS_PORT=15000 \
    CMS_DB_PATH=/app/data/cms.db \
    CMS_STATIC_DIR=/app/web/dist \
    CMS_LOG_LEVEL=info

# Expose HTTP port
EXPOSE 15000

# Native healthcheck using built-in binary subcommand (no curl dependency required)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD ["/app/cms", "healthcheck"]

# Entrypoint
ENTRYPOINT ["/app/cms"]
