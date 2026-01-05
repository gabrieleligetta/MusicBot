#!/bin/bash

# ==========================================
# SCRIPT DI AGGIORNAMENTO COOKIE (Mac/Linux/Windows Git Bash)
# ==========================================

# --- CONFIGURAZIONE UTENTE ---
SERVER_IP="35.222.0.252"
SSH_USER="gabligetta"

# Rilevamento automatico del sistema operativo per i percorsi
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # WINDOWS (Git Bash)
    # Nota: Assicurati che il percorso della chiave sia corretto per il tuo sistema
    KEY_PATH="C:/Users/gabli/.ssh/google_compute_engine"
    LOCAL_COOKIES_PATH="C:/Users/gabli/Desktop/www/MusicBot/cookies.json"
else
    # MAC / LINUX
    KEY_PATH="/Users/gligetta/.ssh/github_musicbot_deploy_key"
    LOCAL_COOKIES_PATH="/Users/gligetta/www/MusicBot/cookies.json"
fi

REMOTE_PATH="/home/gabligetta/musicbot-docker/cookies.json"

# ==========================================

echo "🔍 Controllo sistema: $OSTYPE"
echo "📂 File locale: $LOCAL_COOKIES_PATH"

# 1. Controlla se il file esiste
if [ ! -f "$LOCAL_COOKIES_PATH" ]; then
    echo "❌ Errore: Non trovo il file cookies.json!"
    echo "👉 Assicurati di averlo salvato in: $LOCAL_COOKIES_PATH"
    exit 1
fi

echo "🚀 Caricamento nuovi cookie sul server ($SERVER_IP)..."

# 2. Carica il file via SCP
# Nota: Su Windows, scp gestisce i path stile C:/... se eseguiti da Git Bash/PowerShell
scp -i "$KEY_PATH" "$LOCAL_COOKIES_PATH" $SSH_USER@$SERVER_IP:$REMOTE_PATH

if [ $? -ne 0 ]; then
    echo "❌ Errore durante il caricamento SCP. Controlla la chiave SSH e la connessione."
    exit 1
fi

# 3. Riavvia solo il container musicbot per applicare le modifiche
echo "🔄 Riavvio del bot remoto..."
ssh -i "$KEY_PATH" $SSH_USER@$SERVER_IP "cd musicbot-docker && docker compose -f docker-compose.prod.yml restart musicbot"

echo "✅ Fatto! Bot aggiornato con nuovi cookie."
