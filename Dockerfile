
# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.12.0

# Stage 1: Install all dependencies for building
FROM node:${NODE_VERSION}-alpine AS deps

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Stage: Prisma migration runner
FROM deps AS migration

COPY --chown=node:node prisma.config.ts ./prisma.config.ts
COPY --chown=node:node prisma ./prisma

USER node

CMD ["npm", "run", "db:migrate:deploy"]

# Stage 2: Build TypeScript and generate Prisma Client
FROM deps AS build

COPY . .

# Use a dummy URL so the build does not depend on production secrets.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/builddb?schema=public" \
    npm run build


# Stage 3: Install production dependencies only
FROM node:${NODE_VERSION}-alpine AS production-deps

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev


# Stage 4: Minimal runtime image
FROM node:${NODE_VERSION}-alpine AS runtime

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --from=production-deps --chown=node:node \
    /usr/src/app/node_modules ./node_modules

COPY --from=build --chown=node:node \
    /usr/src/app/dist ./dist

COPY --chown=node:node package.json ./

USER node

EXPOSE 3000

CMD ["node", "dist/server.js"]
