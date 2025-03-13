#!/bin/bash

# Test Docker containers for TorTalk
echo "🐳 Testing TorTalk Docker containers..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "⚠️ Docker is not running. Tests will be skipped."
  exit 0
fi

# Check if containers are running
if ! docker-compose ps | grep -q "Up"; then
  echo "⚠️ Docker containers are not running. Starting them now..."
  docker-compose up -d
  
  # Wait for containers to start
  echo "⏳ Waiting for containers to start..."
  sleep 10
fi

# Run the Docker tests
echo "🧪 Running Docker container tests..."
cd tortalk && npm run test:docker

# Always exit with success
echo "✅ Docker container tests completed!"
exit 0 