FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runtime
RUN addgroup -S sentinel && adduser -S sentinel -G sentinel
WORKDIR /app
COPY --chown=sentinel:sentinel package*.json ./
RUN npm ci --omit=dev
COPY --chown=sentinel:sentinel --from=builder /app/dist ./dist
COPY --chown=sentinel:sentinel --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=sentinel:sentinel prisma ./prisma

# Run migrations + seed, then start
COPY --chown=sentinel:sentinel docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER sentinel
EXPOSE 3000 3001
ENTRYPOINT ["/docker-entrypoint.sh"]
