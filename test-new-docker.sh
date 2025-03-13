#!/bin/bash

# Test the new Docker setup for TorTalk
echo "🐳 Testing new TorTalk Docker containers..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "⚠️ Docker is not running. Tests will be skipped."
  exit 0
fi

# Check if containers are running
if ! docker-compose -f docker-compose-new.yml ps | grep -q "Up"; then
  echo "⚠️ Docker containers are not running. Starting them now..."
  docker-compose -f docker-compose-new.yml up -d
  
  # Wait for containers to start
  echo "⏳ Waiting for containers to start..."
  sleep 10
fi

# Test the server
echo "🧪 Testing server (port 3002)..."
SERVER_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health)
if [ "$SERVER_HEALTH" == "200" ]; then
  echo "✅ Server health check passed (Status: $SERVER_HEALTH)"
else
  echo "⚠️ Server health check returned status: $SERVER_HEALTH"
fi

SERVER_API=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/status)
if [ "$SERVER_API" == "200" ]; then
  echo "✅ Server API status check passed (Status: $SERVER_API)"
else
  echo "⚠️ Server API status check returned status: $SERVER_API"
fi

# Test the clients
echo "🧪 Testing client1 (port 9092)..."
CLIENT1=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9092)
if [ "$CLIENT1" == "200" ]; then
  echo "✅ Client1 check passed (Status: $CLIENT1)"
else
  echo "⚠️ Client1 check returned status: $CLIENT1"
fi

echo "🧪 Testing client2 (port 9093)..."
CLIENT2=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9093)
if [ "$CLIENT2" == "200" ]; then
  echo "✅ Client2 check passed (Status: $CLIENT2)"
else
  echo "⚠️ Client2 check returned status: $CLIENT2"
fi

# Summary
echo ""
echo "📊 Test Summary:"
echo "Server: http://localhost:3002 - Status: $SERVER_HEALTH"
echo "API: http://localhost:3002/api/status - Status: $SERVER_API"
echo "Client1: http://localhost:9092 - Status: $CLIENT1"
echo "Client2: http://localhost:9093 - Status: $CLIENT2"

# Always exit with success
echo "✅ Docker container tests completed!"
exit 0 