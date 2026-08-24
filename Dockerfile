# Multi-stage Dockerfile for ArenaVerse Express API
FROM node:20-alpine AS base
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ ./

EXPOSE 5000
ENV NODE_ENV=production

CMD ["node", "server.js"]
