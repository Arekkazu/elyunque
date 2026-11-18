FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Directorio de logs (access.log / error.log) escribible por el usuario node
RUN mkdir -p /app/logs && chown node:node /app/logs
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1

# Aplica migraciones al arrancar; SEED_ON_START=true carga datos demo
CMD ["sh", "-c", "node src/db/migrate.js && ([ \"$SEED_ON_START\" = \"true\" ] && node src/db/seed.js || true) && node src/server.js"]
