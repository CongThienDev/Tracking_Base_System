FROM node:20-alpine AS builder

WORKDIR /app

COPY . .
RUN npm ci
RUN npm run -w @tracking-base/router-worker build
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/router-worker/package.json ./apps/router-worker/package.json
COPY --from=builder /app/apps/router-worker/dist ./apps/router-worker/dist

CMD ["node", "apps/router-worker/dist/worker.js"]
