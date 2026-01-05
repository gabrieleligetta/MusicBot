#!/bin/bash

# Configurazione
SERVER_IP="35.222.0.252"
USER="gabligetta"
KEY_PATH="/Users/gligetta/.ssh/github_musicbot_deploy_key"
LOCAL_COOKIES_PATH="/Users/gligetta/www/MusicBot/cookies.json" # Dove il tuo browser salva il file
REMOTE_PATH="/home/gabligetta/musicbot-docker/cookies.json"

# 1. Controlla se hai scaricato il file
if [ ! -f "$LOCAL_COOKIES_PATH" ]; then
    echo "❌ Errore: Non trovo il file $LOCAL_COOKIES_PATH"
    echo "👉 Scarica prima i cookie dal browser!"
    exit 1
fi

echo "🚀 Caricamento nuovi cookie sul server..."

# 2. Carica il file via SCP
scp -i "$KEY_PATH" "$LOCAL_COOKIES_PATH" $USER@$SERVER_IP:$REMOTE_PATH

# 3. Riavvia solo il container musicbot per applicare le modifiche
echo "🔄 Riavvio del bot..."
ssh -i "$KEY_PATH" $USER@$SERVER_IP "cd musicbot-docker && docker compose restart musicbot"

echo "✅ Fatto! Bot aggiornato con nuovi cookie."
# Opzionale: cancella il file locale per pulizia
# rm "$LOCAL_COOKIES_PATH"
