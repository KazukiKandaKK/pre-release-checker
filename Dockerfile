# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/playwright:v1.61.1-jammy AS base
WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/runner/package.json ./apps/runner/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/storage/package.json ./packages/storage/

RUN npm ci

COPY . .
RUN npm run build

FROM mcr.microsoft.com/playwright:v1.61.1-jammy AS app
WORKDIR /app
ENV NODE_ENV=production
ENV REDIS_URL=redis://redis:6379
ENV DATABASE_URL=file:/app/data/dev.db
ENV STORAGE_TYPE=local
ENV STORAGE_LOCAL_PATH=/app/data/storage

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./
COPY --from=base /app/apps ./apps
COPY --from=base /app/packages ./packages

RUN mkdir -p /app/data/storage

EXPOSE 3001
CMD ["npm", "--prefix", "apps/api", "run", "start"]

FROM nginx:alpine AS web
COPY --from=base /app/apps/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
