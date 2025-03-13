FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Install level package explicitly
RUN npm install level@8.0.0

# Create data directory
RUN mkdir -p data

# Copy server files
COPY . .

# Expose the port the server runs on
EXPOSE 3001

# Command to run the server
CMD ["node", "server.js"] 