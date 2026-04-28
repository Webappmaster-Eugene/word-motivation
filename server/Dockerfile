FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
# tsconfig.json нужен ts-node для `prisma db seed` — без него Node.js
# падает в ESM-loader по дефолту, и импорты вроде `./seed/animals`
# (без расширения) не резолвятся (ERR_MODULE_NOT_FOUND).
COPY tsconfig.json ./
# TTS-кеш: создаём директорию и даём права `app` пользователю ДО USER app.
# Без этого docker-compose мontирует named volume `babyfunner-tts-cache` в
# `/data/tts-cache` как owned by root, а наш NestJS бежит под `app` → падает
# в TtsCacheService.onModuleInit() на попытке создать `.write-probe`. Dokploy
# тогда показывает healthcheck failure без полезного контекста.
# Права копируются volume'ом при первом монтировании (если volume пустой),
# так что этого одного chown достаточно.
RUN mkdir -p /data/tts-cache && chown -R app:app /data
USER app
EXPOSE 3000
# NestJS из-за `prisma/` в tsconfig.include укладывает бандл в dist/src/.
#
# При старте контейнера:
#   1. `prisma migrate deploy` — накатывает применимые миграции из prisma/migrations/.
#      Идемпотентно: если БД уже актуальна, команда просто выходит 0.
#   2. `prisma db seed` — сид контента (animals + words). Идемпотентный (upsert).
#   3. `node dist/src/main.js` — запуск Nest/Fastify.
# Если п.1 или п.2 упадут — контейнер упадёт, Dokploy покажет ошибку в логах.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/src/main.js"]
