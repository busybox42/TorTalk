#!/bin/bash

# Start and test the new Docker setup for TorTalk
echo "🐳 Starting new TorTalk Docker containers..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

# Stop any existing containers with the same names
echo "🛑 Stopping any existing containers with the same names..."
docker stop tortalk-server-new tortalk-client1-new tortalk-client2-new 2>/dev/null || true
docker rm tortalk-server-new tortalk-client1-new tortalk-client2-new 2>/dev/null || true

# Start the containers
echo "🚀 Starting the containers..."
docker-compose -f docker-compose-new.yml up -d

# Wait for containers to start
echo "⏳ Waiting for containers to start..."
sleep 10

# Check if containers are running
echo "🔍 Checking if containers are running..."
docker-compose -f docker-compose-new.yml ps

# Test the server
echo "🧪 Testing server (port 3002)..."
curl -s http://localhost:3002/health || echo "Server health endpoint not accessible"
echo ""
curl -s http://localhost:3002/api/status || echo "Server API status endpoint not accessible"
echo ""

# Test the clients
echo "🧪 Testing client1 (port 9092)..."
curl -s -I http://localhost:9092 | head -n 1 || echo "Client1 not accessible"
echo ""

echo "🧪 Testing client2 (port 9093)..."
curl -s -I http://localhost:9093 | head -n 1 || echo "Client2 not accessible"
echo ""

echo "✅ Setup complete!"
echo "Server: http://localhost:3002"
echo "Client1: http://localhost:9092"
echo "Client2: http://localhost:9093" 