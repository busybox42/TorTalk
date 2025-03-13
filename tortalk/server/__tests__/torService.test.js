/**
 * Unit tests for the Tor service
 */

const torService = require('../lib/torService');

// Set environment to development for testing
process.env.NODE_ENV = 'development';

describe('TorService', () => {
  // Test user ID
  const testUserId = 'test_user_123';

  // Clean up after tests
  afterAll(async () => {
    // Remove test hidden service
    await torService.removeHiddenService(testUserId);
  });

  test('should connect to Tor in development mode', async () => {
    const result = await torService.connect();
    expect(result).toBe(true);
    expect(torService.isConnected).toBe(true);
  });

  test('should create a hidden service in development mode', async () => {
    const service = await torService.createHiddenService(testUserId);
    
    expect(service).toBeTruthy();
    expect(service.userId).toBe(testUserId);
    expect(service.onionAddress).toBeTruthy();
    expect(service.onionAddress.endsWith('.onion')).toBe(true);
    expect(service.port).toBeTruthy();
    expect(service.target).toBeTruthy();
    expect(service.privateKey).toBeTruthy();
    expect(service.createdAt).toBeTruthy();
  });

  test('should get a hidden service by userId', () => {
    const service = torService.getHiddenService(testUserId);
    
    expect(service).toBeTruthy();
    expect(service.userId).toBe(testUserId);
    expect(service.onionAddress).toBeTruthy();
  });

  test('should get all hidden services', () => {
    const services = torService.getAllHiddenServices();
    
    expect(Array.isArray(services)).toBe(true);
    
    // Find our test service
    const testService = services.find(s => s.userId === testUserId);
    expect(testService).toBeTruthy();
  });

  test('should remove a hidden service', async () => {
    const result = await torService.removeHiddenService(testUserId);
    expect(result).toBe(true);
    
    // Verify it's gone
    const service = torService.getHiddenService(testUserId);
    expect(service).toBeNull();
  });

  test('should generate a fake onion address', () => {
    const onionAddress = torService.generateFakeOnionAddress();
    
    expect(onionAddress).toBeTruthy();
    expect(onionAddress.endsWith('.onion')).toBe(true);
    expect(onionAddress.length).toBeGreaterThan(10);
  });

  test('should disconnect from Tor', async () => {
    const result = await torService.disconnect();
    expect(result).toBe(true);
  });

  test('should handle non-existent hidden service removal gracefully', async () => {
    const result = await torService.removeHiddenService('nonexistent_user');
    expect(result).toBe(false);
  });
}); 