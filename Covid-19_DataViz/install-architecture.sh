#!/bin/bash

echo "🚀 Installation complète de l’architecture Covid-19 DataViz..."

# Installation des dépendances
echo "📦 Installation des dépendances backend..."
cd covid19-datavizback && npm install

echo "📦 Installation des dépendances frontend..."
cd ../covid19-datavizfront && npm install

# Retour au dossier racine
cd ..

# Lancer Docker
echo "🐳 Construction et lancement des conteneurs..."
chmod +x start.sh
./start.sh

echo "📊 LANCEMENT AUTOMATIQUE DE L’ANALYSE DES DONNÉES..."
chmod +x data-processing.sh
./data-processing.sh

echo "✅ Installation terminée !"
echo "➡️ Frontend : http://localhost:3000"
echo "➡️ Backend : http://localhost:5000/api"