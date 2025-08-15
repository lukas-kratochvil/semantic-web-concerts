#-------------------------------------------
# BASE
#-------------------------------------------
FROM node:20-bullseye AS base

WORKDIR /app

# Install dependencies required by Chromium (used by Puppeteer)
RUN apt-get update && apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*


#-------------------------------------------
# BUILD BASE
#-------------------------------------------
FROM base AS builder-base

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

# Don't run production as root.
# Remove default Node alpine image user and create a new one.
RUN deluser --remove-home node \
  && addgroup -S -g 1001 node \
  && adduser -S -g node -u 1001 scraper
USER scraper

COPY --from=installer --chown=scraper:node /app/apps/scraper/dist ./

CMD node apps/scraper/dist/main.js
