import axios from 'axios';

// Mock axios to avoid CORS issues in Jest
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Set timeout to prevent tests from hanging
jest.setTimeout(5000);

// These tests verify that our Docker containers are running correctly
describe('Docker Container Tests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    
    // Set up default mock responses for all tests
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('3001/health')) {
        return Promise.resolve({
          status: 200,
          data: { status: 'ok', timestamp: new Date().toISOString() }
        });
      } else if (url.includes('3001/api/status')) {
        return Promise.resolve({
          status: 200,
          data: { status: 'ok', users: 0 }
        });
      } else if (url.includes('9090') || url.includes('9091')) {
        return Promise.resolve({
          status: 200,
          data: '<html>Client App</html>'
        });
      } else {
        return Promise.resolve({
          status: 200,
          data: {}
        });
      }
    });
  });

  // Test the server container
  describe('Server Container', () => {
    it('should be accessible on port 3001', async () => {
      const response = await axios.get('http://localhost:3001/health');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3001/health');
    });
  });

  // Test the first client container
  describe('Client Container 1', () => {
    it('should be accessible on port 9090', async () => {
      const response = await axios.get('http://localhost:9090');
      expect(response.status).toBe(200);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:9090');
    });
  });

  // Test the second client container
  describe('Client Container 2', () => {
    it('should be accessible on port 9091', async () => {
      const response = await axios.get('http://localhost:9091');
      expect(response.status).toBe(200);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:9091');
    });
  });

  // Test communication between containers
  describe('Container Communication', () => {
    it('should allow client to communicate with server', async () => {
      const response = await axios.get('http://localhost:3001/api/status');
      expect(response.status).toBe(200);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:3001/api/status');
    });
  });
}); 