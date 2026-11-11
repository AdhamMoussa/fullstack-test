# Dev image for @repo/contract. Source is bind-mounted at runtime (see compose.yaml).
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

CMD ["pnpm", "--filter", "@repo/contract", "watch"]
