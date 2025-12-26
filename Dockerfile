FROM node:18-slim

# Install dependencies for native modules (better-sqlite3, sodium, ffmpeg)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Create volume for database and playlists
VOLUME ["/app/Playlists"]

CMD ["node", "index.js"]
