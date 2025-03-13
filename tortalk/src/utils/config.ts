// Configuration for different environments

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Get environment variables
const apiUrl = process.env.REACT_APP_API_URL;
const websocketUrl = process.env.REACT_APP_WEBSOCKET_URL;
const enableRelay = process.env.REACT_APP_ENABLE_RELAY === 'true';

// API endpoints
const config = {
  // In production (Docker), use the environment variables or fallback to defaults
  // In development, we connect directly to the server on port 3001
  serverUrl: apiUrl || (isProduction ? '' : 'http://localhost:3001'),
  socketUrl: websocketUrl || (isProduction ? '' : 'http://localhost:3001'),
  enableRelay: enableRelay || false,
};

export default config; 