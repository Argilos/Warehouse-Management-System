# Multi-stage Dockerfile for Enterprise Warehouse Asset Management System

# Stage 1: Dependencies & Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations & package definitions
COPY frontend/package*.json ./
RUN npm ci

# Copy application source code
COPY frontend/ ./

# Build production bundle
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine AS runner

# Copy custom Nginx SPA configuration
RUN echo $'server {\n\
    listen 80;\n\
    server_name localhost;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    error_page 500 502 503 504 /50x.html;\n\
    location = /50x.html {\n\
        root /usr/share/nginx/html;\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

# Copy build output from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
