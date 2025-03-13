/**
 * Unit tests for the DHT implementation
 */

const path = require('path');
const fs = require('fs');
const dht = require('../lib/dht');

// Use a test directory for the DHT database
const TEST_DIR = path.join(__dirname, '../data/test');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

describe('DHT', () => {
  // Test user data
  const testUser = {
    userId: 'test_user_123',
    username: 'testuser',
    publicKey: 'test-public-key',
    onionAddress: 'test123.onion'
  };

  // Clean up after tests
  afterAll(async () => {
    // Clean up test data
    try {
      await dht.removeUser(testUser.userId);
    } catch (error) {
      console.error('Error cleaning up test user:', error);
    }
  });

  test('should store a user in the DHT', async () => {
    const result = await dht.storeUser(testUser);
    expect(result).toBe(true);
  });

  test('should find a user by username', async () => {
    const user = await dht.findUserByUsername(testUser.username);
    expect(user).toBeTruthy();
    expect(user.userId).toBe(testUser.userId);
    expect(user.username).toBe(testUser.username);
    expect(user.publicKey).toBe(testUser.publicKey);
    expect(user.onionAddress).toBe(testUser.onionAddress);
  });

  test('should find a user by userId', async () => {
    const user = await dht.findUserByUserId(testUser.userId);
    expect(user).toBeTruthy();
    expect(user.userId).toBe(testUser.userId);
    expect(user.username).toBe(testUser.username);
  });

  test('should find a user by onion address', async () => {
    const user = await dht.findUserByOnionAddress(testUser.onionAddress);
    expect(user).toBeTruthy();
    expect(user.userId).toBe(testUser.userId);
    expect(user.username).toBe(testUser.username);
  });

  test('should update a user in the DHT', async () => {
    const updatedUser = {
      ...testUser,
      publicKey: 'updated-public-key',
      onionAddress: 'updated123.onion'
    };

    const result = await dht.updateUser(updatedUser);
    expect(result).toBe(true);

    // Verify the update
    const user = await dht.findUserByUserId(testUser.userId);
    expect(user.publicKey).toBe(updatedUser.publicKey);
    expect(user.onionAddress).toBe(updatedUser.onionAddress);
  });

  test('should list all users in the DHT', async () => {
    const users = await dht.listUsers();
    expect(Array.isArray(users)).toBe(true);
    
    // Find our test user in the list
    const foundUser = users.find(u => u.userId === testUser.userId);
    expect(foundUser).toBeTruthy();
  });

  test('should remove a user from the DHT', async () => {
    const result = await dht.removeUser(testUser.userId);
    expect(result).toBe(true);

    // Verify the user is gone
    const user = await dht.findUserByUserId(testUser.userId);
    expect(user).toBeNull();
  });

  test('should handle case insensitive username lookups', async () => {
    // Store the user again
    await dht.storeUser(testUser);

    // Look up with different case
    const user = await dht.findUserByUsername(testUser.username.toUpperCase());
    expect(user).toBeTruthy();
    expect(user.userId).toBe(testUser.userId);

    // Clean up
    await dht.removeUser(testUser.userId);
  });

  test('should return null for non-existent users', async () => {
    const user = await dht.findUserByUsername('nonexistentuser');
    expect(user).toBeNull();
  });
}); 