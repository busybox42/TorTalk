#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧹 Cleaning up Docker resources for TorTalk...${NC}"

# Stop and remove containers
echo -e "${YELLOW}🛑 Stopping and removing containers...${NC}"
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose-new.yml down

# Remove unused volumes
echo -e "${YELLOW}🗑️ Removing unused volumes...${NC}"
docker volume prune -f

# Remove unused networks
echo -e "${YELLOW}🔗 Removing unused networks...${NC}"
docker network prune -f

# Remove dangling images
echo -e "${YELLOW}🖼️ Removing dangling images...${NC}"
docker image prune -f

echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo -e "${YELLOW}Note: To restart the application, use:${NC}"
echo -e "${GREEN}  ./start-new-docker.sh${NC}" 