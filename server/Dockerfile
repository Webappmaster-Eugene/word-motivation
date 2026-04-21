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
