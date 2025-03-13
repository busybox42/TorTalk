# TorTalk New Docker Setup

This document describes how to use the new Docker setup for TorTalk, which includes a server and two client instances.

## Components

- **Server**: A Node.js server running on port 3002
- **Client 1**: A React client running on port 9092
- **Client 2**: A React client running on port 9093

## Scripts

The following scripts are available to manage the Docker containers:

- `start-new-docker.sh`: Start the Docker containers
- `test-new-docker.sh`: Test if the Docker containers are running correctly
- `stop-new-docker.sh`: Stop the Docker containers

## Usage

### Starting the Containers

To start the Docker containers, run:

```bash
./start-new-docker.sh
```

This will:
1. Stop any existing containers with the same names
2. Start the server and client containers
3. Test if the containers are running correctly

### Testing the Containers

To test if the Docker containers are running correctly, run:

```bash
./test-new-docker.sh
```

This will:
1. Check if Docker is running
2. Check if the containers are running (and start them if they're not)
3. Test the server and client endpoints
4. Display a summary of the test results

### Stopping the Containers

To stop the Docker containers, run:

```bash
./stop-new-docker.sh
```

This will stop and remove the containers.

## Accessing the Applications

- Server: http://localhost:3002
- Client 1: http://localhost:9092
- Client 2: http://localhost:9093

## Docker Compose Configuration

The Docker Compose configuration is defined in `docker-compose-new.yml`. It includes:

- A server container running on port 3002
- Two client containers running on ports 9092 and 9093
- A Docker network for communication between containers

## Troubleshooting

If you encounter any issues:

1. Check if Docker is running
2. Check if the containers are running with `docker-compose -f docker-compose-new.yml ps`
3. Check the container logs with `docker-compose -f docker-compose-new.yml logs`
4. Try stopping and restarting the containers with `./stop-new-docker.sh` and `./start-new-docker.sh` 