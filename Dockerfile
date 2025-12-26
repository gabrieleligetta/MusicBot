# -----------------------------------------------------------------------------
# Stage 1: Builder
# Utilizziamo l'immagine completa (non slim) per avere accesso facilitato ai tool
# -----------------------------------------------------------------------------
FROM node:22-bookworm AS builder

# Impostiamo la directory di lavoro
WORKDIR /usr/src/app

# Aggiornamento dei repository e installazione delle dipendenze di build
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

# Installazione delle dipendenze (compilazione nativa)
RUN npm install --build-from-source

COPY . .

# -----------------------------------------------------------------------------
# Stage 2: Runner (Produzione)
# Torniamo a Debian Bookworm Slim per garantire compatibilità multi-arch (ARM64/AMD64)
# L'immagine di Jim causava problemi di architettura su Apple Silicon.
# Qui replichiamo manualmente l'installazione di yt-dlp e del plugin.
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner

WORKDIR /usr/src/app

# Installazione dipendenze runtime
# python3-pip e python3-venv sono necessari per installare il plugin in modo pulito
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Installazione di yt-dlp (standalone binary)
RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Installazione del plugin bgutil-ytdlp-pot-provider
# Usiamo --break-system-packages su Debian 12 per installare nel sistema globale (accettabile in container)
RUN pip3 install bgutil-ytdlp-pot-provider --break-system-packages

# Verifica installazione
RUN yt-dlp --version

# Copia file dal builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/index.js ./
COPY --from=builder /usr/src/app/utils ./utils
COPY --from=builder /usr/src/app/commands ./commands

RUN mkdir -p Playlists

ENV NODE_ENV=production

CMD ["node", "index.js"]
