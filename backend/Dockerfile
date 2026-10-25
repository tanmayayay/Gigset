# Gigset backend — production image (Render / Railway / Fly.io)
FROM node:22-alpine

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Prisma client (generated at build time; no live DB needed)
COPY prisma ./prisma
RUN npx prisma generate

# App source
COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

# The platform provides PORT; index.js falls back to 4000.
CMD ["node", "src/index.js"]
