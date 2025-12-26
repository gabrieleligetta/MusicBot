#!/bin/bash
set -e

echo "🧹 Inizio pulizia file legacy..."

# Rimuovi workflow Java obsoleti
echo "Removing legacy workflows..."
rm -f .github/workflows/make-release.yml
rm -f .github/workflows/build-and-test.yml

# Rimuovi file di configurazione Java e Maven
echo "Removing Java/Maven config..."
rm -f pom.xml
rm -rf target
rm -rf .idea
rm -f *.iml

# Rimuovi tutto il codice sorgente Java
echo "Removing Java source code..."
# Rimuove ricorsivamente tutti i file .java
find . -name "*.java" -type f -delete
# Rimuove la struttura standard delle directory Java se vuote
rm -rf src/main/java
rm -rf src/main/resources
rm -rf src/test

# Rimuovi script vecchi se non servono (opzionale, controlla prima)
# rm -f scripts/run_jmusicbot.sh

echo "✅ Pulizia completata. I file obsoleti sono stati rimossi."
