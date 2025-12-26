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

# Installazione dipendenze runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# --- MODIFICA CHIAVE PER ALLINEAMENTO RUST ---
# Invece di scaricare yt-dlp e installare un plugin pip incompatibile,
# copiamo yt-dlp direttamente dall'immagine ufficiale del progetto Rust (jim60105).
# Questa versione include già il supporto nativo per il sidecar Rust.
COPY --from=ghcr.io/jim60105/yt-dlp:pot /usr/local/bin/yt-dlp /usr/local/bin/yt-dlp

# Assicuriamo i permessi di esecuzione
RUN chmod a+rx /usr/local/bin/yt-dlp
# -------------------------------------------------------------

# Copia file dal builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/src ./src

RUN mkdir -p Playlists

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
