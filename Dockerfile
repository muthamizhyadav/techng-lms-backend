# ---- deps ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build \
  && npm prune --omit=dev

# ---- runtime ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nestjs \
  && useradd --system --uid 1001 --gid nestjs nestjs

COPY --from=build --chown=nestjs:nestjs /app/package.json /app/package-lock.json ./
COPY --from=build --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nestjs /app/dist ./dist

USER nestjs
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
