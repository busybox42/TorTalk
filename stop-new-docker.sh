#!/bin/bash

# Stop the new Docker setup for TorTalk
echo "🛑 Stopping new TorTalk Docker containers..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "⚠️ Docker is not running. Nothing to stop."
  exit 0
fi

# Stop the containers
echo "🛑 Stopping containers..."
docker-compose -f docker-compose-new.yml down

echo "✅ Containers stopped successfully!" 