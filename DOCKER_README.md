# TorTalk Docker Deployment Guide

This guide provides instructions for deploying TorTalk using Docker containers, both locally and on a remote server.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system
- Your user must be in the docker group to run Docker commands without sudo

## Project Structure

The TorTalk application consists of two main components:

1. **Server**: A Node.js WebSocket server that handles user authentication, message relay, and user discovery
2. **Client**: A React web application that provides the user interface

## Docker Configuration Files

- `docker-compose.yml`: Orchestrates both the client and server containers
- `tortalk/Dockerfile`: Builds the client container
- `tortalk/server/Dockerfile`: Builds the server container
- `tortalk/nginx.conf`: Configures Nginx for the client container

## Local Deployment

### Adding Your User to the Docker Group

If you haven't already, add your user to the docker group to avoid permission issues:

```bash
sudo usermod -aG docker $USER
```

**Note**: You'll need to log out and log back in for this change to take effect.

### Building and Starting the Containers

1. Navigate to the project root directory:
   ```bash
   cd /path/to/TorTalk
   ```

2. Build the Docker images:
   ```bash
   docker-compose build
   ```

3. Start the containers:
   ```bash
   docker-compose up -d
   ```

4. Check if the containers are running:
   ```bash
   docker-compose ps
   ```

### Accessing the Application

- Client: http://localhost
- Server API: http://localhost/api

### Viewing Logs

```bash
# View all logs
docker-compose logs

# View client logs
docker-compose logs client

# View server logs
docker-compose logs server

# Follow logs in real-time
docker-compose logs -f
```

### Stopping the Containers

```bash
docker-compose down
```

## Remote Deployment

### Using the Deployment Script

We've provided a deployment script (`deploy.sh`) that prepares a deployment package for your remote server:

1. Edit the script to configure your remote server details:
   ```bash
   # Configuration
   REMOTE_USER="your-username"
   REMOTE_HOST="your-server-hostname-or-ip"
   REMOTE_DIR="/path/to/deployment"
   ```

2. Run the script:
   ```bash
   ./deploy.sh
   ```

3. Follow the instructions provided by the script to transfer and deploy the application on your remote server.

### Manual Remote Deployment

1. Copy the necessary files to your remote server:
   ```bash
   scp -r docker-compose.yml tortalk/Dockerfile tortalk/nginx.conf tortalk/server/Dockerfile user@your-server:/path/to/deployment
   ```

2. SSH into your server:
   ```bash
   ssh user@your-server
   ```

3. Navigate to the deployment directory:
   ```bash
   cd /path/to/deployment
   ```

4. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

## Environment Variables

You can customize the deployment by setting environment variables in the docker-compose.yml file:

### Server Environment Variables
- `NODE_ENV`: Set to 'production' for production deployment
- `PORT`: The port the server will listen on (default: 3001)

## Troubleshooting

1. If you get permission errors when running Docker commands:
   - Make sure your user is in the docker group
   - Log out and log back in for group changes to take effect
   - Alternatively, you can use sudo (not recommended for security reasons)

2. If the client can't connect to the server:
   - Check that the server container is running
   - Verify the nginx configuration is correctly proxying requests
   - Check the server logs for any errors

3. If the server fails to start:
   - Check the server logs for error messages
   - Verify that all required environment variables are set

4. For any other issues:
   - Check the Docker logs for both containers
   - Verify that the Docker network is correctly configured

## Security Considerations

- The default configuration exposes the application on port 80. For production, you should use HTTPS.
- Consider using Docker secrets for sensitive information
- Regularly update the Docker images to include security patches 