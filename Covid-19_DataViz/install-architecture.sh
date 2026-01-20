#!/bin/bash

echo "🚀 Installation complète de l'architecture Covid-19 DataViz..."

echo "📦 Installation des dépendances backend..."
cd covid19-datavizback && npm install
cd ..

echo "📦 Installation des dépendances frontend..."
cd covid19-datavizfront

rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

cd ..

echo "🐳 Construction et lancement des conteneurs..."
chmod +x start.sh
./start.sh

echo "📊 LANCEMENT AUTOMATIQUE DE L'ANALYSE DES DONNÉES..."
chmod +x data-processing.sh
./data-processing.sh

echo "✅ Installation terminée !"
echo "➡️ Frontend : http://localhost:3000"
echo "➡️ Backend : http://localhost:5000/api"