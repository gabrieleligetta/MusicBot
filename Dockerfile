# -----------------------------------------------------------------------------
# Stage 1: Builder
# Utilizziamo l'immagine completa (non slim) per avere accesso facilitato ai tool
# -----------------------------------------------------------------------------
FROM node:22-bookworm AS builder

# Impostiamo la directory di lavoro
WORKDIR /usr/src/app

# Aggiornamento dei repository e installazione delle dipendenze di build
# python3, make, g++, gcc: Essenziali per node-gyp
# libsodium-dev, libtool, autoconf: Necessari se sodium-native compila da sorgente
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

# Copia dei file di definizione delle dipendenze
COPY package*.json ./

# Installazione delle dipendenze.
# --build-from-source: Forza la compilazione locale per garantire compatibilità ABI
# con l'architettura del container, evitando prebuilt corrotti.
# Usiamo npm install invece di npm ci perché il package-lock.json potrebbe non essere sincronizzato
RUN npm install --build-from-source

# Copia del codice sorgente
COPY . .

# -----------------------------------------------------------------------------
# Stage 2: Runner (Produzione)
# Utilizziamo la versione Slim per ridurre la dimensione finale
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner

WORKDIR /usr/src/app

# Installazione delle dipendenze di runtime di sistema
# ffmpeg: Necessario per la transcodifica audio (non usare ffmpeg-static in prod se possibile)
# python3: Runtime per yt-dlp
# wget: Per scaricare il binario di yt-dlp
# ca-certificates: Per connessioni SSL/TLS sicure verso Discord
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Installazione di yt-dlp (standalone binary)
RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Verifica installazione
RUN yt-dlp --version

# Copia delle dipendenze compilate dallo stage builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json

# Copia del codice sorgente
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/index.js ./
COPY --from=builder /usr/src/app/utils ./utils
COPY --from=builder /usr/src/app/commands ./commands
# Creiamo le directory per i volumi
RUN mkdir -p Playlists

# Variabili d'ambiente per ottimizzazione Node
ENV NODE_ENV=production

# Comando di avvio
CMD ["node", "index.js"]
