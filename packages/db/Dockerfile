# Dev image for @repo/db. Source is bind-mounted at runtime (see compose.yaml).
FROM node:26.13.0-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl procps \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@11.0.5

WORKDIR /app

# Download dependencies from the lockfile alone, so this layer survives source edits.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY . .
# CI=true: non-interactive; lets pnpm relink the store `pnpm fetch` created.
RUN CI=true pnpm install --offline --frozen-lockfile
# Warms Prisma's engine cache in the image; the client itself is regenerated at runtime.
RUN MONGODB_URI="mongodb://localhost:27017/assessment" pnpm --filter @repo/db generate

# generate -> db push (dev + test DBs) -> tsup watch; healthy once dist is built.
CMD ["pnpm", "--filter", "@repo/db", "dev"]
