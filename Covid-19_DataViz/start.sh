#!/bin/bash
echo "Nettoyage Docker..."
docker-compose down -v --remove-orphans

echo "Build et lancement des conteneurs..."
docker-compose up -d --build

echo "Vérification de l'état..."
docker ps
