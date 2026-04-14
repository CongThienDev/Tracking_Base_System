FROM node:20-alpine AS builder

WORKDIR /app

COPY . .
RUN npm ci
RUN npm run -w @tracking-base/tracking-api build
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/tracking-api/package.json ./apps/tracking-api/package.json
COPY --from=builder /app/apps/tracking-api/dist ./apps/tracking-api/dist

EXPOSE 3000

CMD ["node", "apps/tracking-api/dist/server.js"]
