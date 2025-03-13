#!/bin/bash

# TorTalk Deployment Script
# This script prepares and deploys TorTalk to a remote Docker server

# Configuration
REMOTE_USER="your-username"
REMOTE_HOST="your-server-hostname-or-ip"
REMOTE_DIR="/path/to/deployment"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}TorTalk Deployment Script${NC}"
echo "========================================"

# Step 1: Create a deployment package
echo -e "${YELLOW}Step 1: Creating deployment package...${NC}"

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Copy necessary files
echo "Copying files..."
cp docker-compose.yml "$TEMP_DIR/"
mkdir -p "$TEMP_DIR/tortalk/server"
cp -r tortalk/server/Dockerfile "$TEMP_DIR/tortalk/server/"
cp -r tortalk/server/package*.json "$TEMP_DIR/tortalk/server/"
cp -r tortalk/server/server.js "$TEMP_DIR/tortalk/server/"
cp -r tortalk/server/lib "$TEMP_DIR/tortalk/server/" 2>/dev/null || :

cp -r tortalk/Dockerfile "$TEMP_DIR/tortalk/"
cp -r tortalk/nginx.conf "$TEMP_DIR/tortalk/"
cp -r tortalk/package*.json "$TEMP_DIR/tortalk/"
cp -r tortalk/public "$TEMP_DIR/tortalk/"
cp -r tortalk/src "$TEMP_DIR/tortalk/"
cp -r tortalk/tsconfig.json "$TEMP_DIR/tortalk/" 2>/dev/null || :
cp -r tortalk/craco.config.js "$TEMP_DIR/tortalk/" 2>/dev/null || :

echo "Deployment package created successfully!"

# Step 2: Create a tar archive
echo -e "${YELLOW}Step 2: Creating tar archive...${NC}"
TAR_FILE="tortalk-deployment.tar.gz"
tar -czf "$TAR_FILE" -C "$TEMP_DIR" .
echo "Created archive: $TAR_FILE"

# Step 3: Transfer to remote server
echo -e "${YELLOW}Step 3: Transferring to remote server...${NC}"
echo "Please enter the remote server details when prompted."
echo "Remote server: $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"
echo "To deploy, run:"
echo "scp $TAR_FILE $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"
echo "ssh $REMOTE_USER@$REMOTE_HOST \"cd $REMOTE_DIR && tar -xzf $TAR_FILE && docker-compose up -d\""

# Clean up
echo -e "${YELLOW}Cleaning up...${NC}"
rm -rf "$TEMP_DIR"
echo "Temporary directory removed."

echo -e "${GREEN}Deployment package prepared successfully!${NC}"
echo "========================================"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Transfer the deployment package to your remote server"
echo "2. Extract the package on the remote server"
echo "3. Run docker-compose up -d to start the containers"
echo ""
echo "Example commands:"
echo "scp $TAR_FILE $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"
echo "ssh $REMOTE_USER@$REMOTE_HOST \"cd $REMOTE_DIR && tar -xzf $TAR_FILE && docker-compose up -d\"" 