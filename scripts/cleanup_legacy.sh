#!/bin/bash
set -e

echo "🧹 Inizio pulizia file legacy..."

# Rimuovi workflow Java obsoleti
rm -f .github/workflows/make-release.yml
rm -f .github/workflows/build-and-test.yml

# Rimuovi file di configurazione Java
rm -f pom.xml
rm -rf target
rm -rf .idea
rm -f *.iml

# Rimuovi codice sorgente Java (se sicuro che non serva più nulla in src/main/java)
# Nota: Manteniamo src/ se contiene altro, ma rimuoviamo la struttura Java standard se vuota o inutile
# Per sicurezza, rimuoviamo solo se l'utente lo esegue consapevolmente.
# rm -rf src/main/java

echo "✅ Pulizia completata. I file obsoleti sono stati rimossi."
