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

# 1. Installiamo le dipendenze base
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    ca-certificates \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# 2. Installiamo yt-dlp (Core)
RUN pip3 install --no-cache-dir --break-system-packages --upgrade yt-dlp

# 3. FIX VERSION MISMATCH: Copiamo il plugin client ESATTO dall'immagine del server
# Questo assicura che il plugin (client) sia compatibile al 100% con il sidecar (server)
COPY --from=ghcr.io/jim60105/bgutil-pot:latest /client /etc/yt-dlp-plugins/bgutil-ytdlp-pot-provider

# 4. FIX JS RUNTIME: Installiamo Deno
# yt-dlp ora richiede un motore JS. Node c'è, ma Deno è quello supportato nativamente
# e non richiede configurazioni aggiuntive nel codice del bot.
COPY --from=denoland/deno:bin /deno /usr/bin/deno

# Copia file dal builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/src ./src

RUN mkdir -p Playlists

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
