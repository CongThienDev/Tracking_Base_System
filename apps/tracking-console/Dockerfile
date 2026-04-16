FROM node:20-alpine AS builder

WORKDIR /app

COPY . .
RUN npm ci
RUN npm run build:console

FROM nginx:1.27-alpine AS runtime

COPY apps/tracking-console/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/tracking-console/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
