# Gigset backend — production image (Render / Railway / Fly.io)
# Build context is the repo root (Render Blueprint); backend lives in backend/.
FROM node:22-alpine

WORKDIR /app

# Install deps first (better layer caching)
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev

# Prisma client (generated at build time; no live DB needed)
COPY backend/prisma ./prisma
RUN npx prisma generate

# App source
COPY backend/src ./src

ENV NODE_ENV=production
EXPOSE 4000

# The platform provides PORT; index.js falls back to 4000.
CMD ["node", "src/index.js"]
