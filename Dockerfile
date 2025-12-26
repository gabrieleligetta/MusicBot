# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM node:22-bookworm AS builder

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    gcc \
    libc6-dev \
    libtool \
    autoconf \
    automake \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --build-from-source
COPY . .

# -----------------------------------------------------------------------------
# Stage 2: Runner (Produzione)
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner

WORKDIR /usr/src/app

# Installazione dipendenze runtime e Python/Pip per yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Installazione yt-dlp e plugin provider
# Usiamo --break-system-packages perché siamo in un container isolato
RUN pip3 install --no-cache-dir --break-system-packages --upgrade yt-dlp \
    && pip3 install --no-cache-dir --break-system-packages bgutil-ytdlp-pot-provider

# Copia file dal builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/src ./src

RUN mkdir -p Playlists

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
