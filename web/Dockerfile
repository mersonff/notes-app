# syntax=docker/dockerfile:1
# Multi-stage build for the Vue SPA. Stage 1 builds the static bundle with
# pnpm; stage 2 serves it with an unprivileged nginx that also reverse-proxies
# /api and /up to the api container, so the bundle can be built with no
# absolute API URL baked in.

ARG NODE_VERSION=22
ARG NGINX_VERSION=1.27

# === Build stage ===
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

# pnpm via corepack (matches the project's pinned 10.x)
RUN corepack enable && corepack prepare pnpm@10.12.3 --activate

# Install deps first (cacheable layer)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Then copy sources and build
COPY . .

# Empty by default — nginx in the runtime stage reverse-proxies /api,
# so the SPA hits relative paths and works behind any host. Override at
# build time (--build-arg VITE_API_URL=https://api.example.com) if you
# prefer hitting the API directly from the browser.
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm build

# === Runtime stage ===
FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine AS runtime

# Copy the built static assets and the nginx vhost
COPY --chown=nginx:nginx --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Unprivileged nginx listens on 8080 by default
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
