# Multi-stage Dockerfile to build frontend and run backend

# --- Frontend build stage ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY Frontend/package*.json ./
RUN npm ci --silent
COPY Frontend/ .
RUN npm run build

# --- Backend install stage ---
FROM node:20-alpine AS backend-base
WORKDIR /app/backend
COPY Backend/package*.json ./
RUN npm ci --only=production --silent
COPY Backend/ .

# Copy built frontend into backend public folder
COPY --from=frontend-builder /app/frontend/dist ./public

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]
