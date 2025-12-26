#!/bin/bash
set -e

echo "📦 Spostamento file in src/..."

# Crea la cartella src se non esiste
mkdir -p src

# Sposta i file e le cartelle
mv index.js src/
mv commands src/
mv utils src/

echo "✅ File spostati in src/"
