FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

USER node
EXPOSE 3000

# Aplica migraciones al arrancar; SEED_ON_START=true carga datos demo
CMD ["sh", "-c", "node src/db/migrate.js && ([ \"$SEED_ON_START\" = \"true\" ] && node src/db/seed.js || true) && node src/server.js"]
