#-------------------------------------------
# BASE
#-------------------------------------------
FROM node:20-alpine AS base

WORKDIR /app


#-------------------------------------------
# BUILD BASE
#-------------------------------------------
FROM base AS builder-base

RUN apk update

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable pnpm

#-------------------------------------------
# BUILD
#-------------------------------------------
FROM builder-base AS builder

RUN pnpm install -g turbo@^2

COPY . .

# # Generate a partial monorepo with a pruned lockfile for a target workspace (https://turbo.build/repo/docs/guides/tools/docker#the-solution).
RUN turbo prune scraper --docker


#-------------------------------------------
# DEVELOPMENT
#-------------------------------------------
FROM builder-base AS development

# Copy over only what we need to install the packages.
# Splitting up dependencies and source files in this way lets us only install dependencies when they change - giving us a much larger speedup.
COPY --from=builder /app/out/json/ .
RUN pnpm i --frozen-lockfile

# Copy over the source files.
COPY --from=builder /app/out/full/ .


#-------------------------------------------
# INSTALL
#-------------------------------------------
FROM development AS installer

# Build the project
RUN pnpm turbo run build


#-------------------------------------------
# PRODUCTION
#-------------------------------------------
FROM base

# Install openssl
RUN apk update && apk upgrade
RUN apk add --no-cache openssl

# Don't run production as root.
# Remove default Node alpine image user and create a new one.
RUN deluser --remove-home node \
  && addgroup -S -g 1001 node \
  && adduser -S -g node -u 1001 scraper
USER scraper

COPY --from=installer --chown=scraper:node /app/apps/scraper/dist ./

CMD node apps/scraper/dist/main.js
