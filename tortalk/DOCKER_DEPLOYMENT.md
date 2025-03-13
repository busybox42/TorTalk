# Docker Deployment for TorTalk

This document provides instructions for deploying TorTalk using Docker containers.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system
- Git to clone the repository

## Local Deployment

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd TorTalk
   ```

2. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

3. Access the application:
   - Client: http://localhost
   - Server API: http://localhost/api

4. View logs:
   ```bash
   # View all logs
   docker-compose logs

   # View client logs
   docker-compose logs client

   # View server logs
   docker-compose logs server
   ```

5. Stop the containers:
   ```bash
   docker-compose down
   ```

## Remote Deployment

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

5. Configure your domain and SSL (optional but recommended):
   - Set up a reverse proxy like Nginx or Traefik
   - Configure SSL certificates using Let's Encrypt

## Environment Variables

You can customize the deployment by setting environment variables in the docker-compose.yml file:

### Server Environment Variables
- `NODE_ENV`: Set to 'production' for production deployment
- `PORT`: The port the server will listen on (default: 3001)

### Client Environment Variables
- `REACT_APP_API_URL`: The URL of the API server (in production, this should be empty as nginx handles proxying)

## Troubleshooting

1. If the client can't connect to the server:
   - Check that the server container is running
   - Verify the nginx configuration is correctly proxying requests
   - Check the server logs for any errors

2. If the server fails to start:
   - Check the server logs for error messages
   - Verify that all required environment variables are set

3. For any other issues:
   - Check the Docker logs for both containers
   - Verify that the Docker network is correctly configured

## Security Considerations

- The default configuration exposes the application on port 80. For production, you should use HTTPS.
- Consider using Docker secrets for sensitive information
- Regularly update the Docker images to include security patches 