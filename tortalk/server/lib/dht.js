/**
 * Distributed Hash Table (DHT) implementation for TorTalk
 * This module provides a DHT for storing and retrieving user information
 * including usernames, public keys, and onion addresses.
 */

const level = require('level');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create a LevelDB database for the DHT
const db = level(path.join(DATA_DIR, 'dht'), { valueEncoding: 'json' });

/**
 * TorTalk DHT implementation
 */
class TorTalkDHT {
  constructor() {
    this.db = db;
  }

  /**
   * Generate a hash key for the DHT
   * @param {string} value - The value to hash
   * @returns {string} - The hash key
   */
  generateKey(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Store a user in the DHT
   * @param {Object} user - User object with username, userId, publicKey, and onionAddress
   * @returns {Promise<boolean>} - Success status
   */
  async storeUser(user) {
    try {
      if (!user.username || !user.userId) {
        throw new Error('Username and userId are required');
      }

      // Store by username (case insensitive)
      const usernameKey = this.generateKey(user.username.toLowerCase());
      await this.db.put(usernameKey, {
        ...user,
        type: 'username',
        timestamp: Date.now()
      });

      // Store by userId
      const userIdKey = this.generateKey(user.userId);
      await this.db.put(userIdKey, {
        ...user,
        type: 'userId',
        timestamp: Date.now()
      });

      // If onion address is provided, store by onion address
      if (user.onionAddress) {
        const onionKey = this.generateKey(user.onionAddress);
        await this.db.put(onionKey, {
          ...user,
          type: 'onion',
          timestamp: Date.now()
        });
      }

      return true;
    } catch (error) {
      console.error('Error storing user in DHT:', error);
      return false;
    }
  }

  /**
   * Find a user by username
   * @param {string} username - The username to look up
   * @returns {Promise<Object|null>} - User object or null if not found
   */
  async findUserByUsername(username) {
    try {
      const key = this.generateKey(username.toLowerCase());
      const user = await this.db.get(key);
      return user;
    } catch (error) {
      if (error.type === 'NotFoundError') {
        return null;
      }
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  /**
   * Find a user by userId
   * @param {string} userId - The userId to look up
   * @returns {Promise<Object|null>} - User object or null if not found
   */
  async findUserByUserId(userId) {
    try {
      const key = this.generateKey(userId);
      const user = await this.db.get(key);
      return user;
    } catch (error) {
      if (error.type === 'NotFoundError') {
        return null;
      }
      console.error('Error finding user by userId:', error);
      throw error;
    }
  }

  /**
   * Find a user by onion address
   * @param {string} onionAddress - The onion address to look up
   * @returns {Promise<Object|null>} - User object or null if not found
   */
  async findUserByOnionAddress(onionAddress) {
    try {
      const key = this.generateKey(onionAddress);
      const user = await this.db.get(key);
      return user;
    } catch (error) {
      if (error.type === 'NotFoundError') {
        return null;
      }
      console.error('Error finding user by onion address:', error);
      throw error;
    }
  }

  /**
   * Update a user's information in the DHT
   * @param {Object} user - User object with updated information
   * @returns {Promise<boolean>} - Success status
   */
  async updateUser(user) {
    try {
      // Get the existing user to check for changes in onion address
      const existingUser = await this.findUserByUserId(user.userId);
      
      // If the user exists and has an onion address that's different from the new one,
      // remove the old onion address entry
      if (existingUser && 
          existingUser.onionAddress && 
          user.onionAddress && 
          existingUser.onionAddress !== user.onionAddress) {
        const oldOnionKey = this.generateKey(existingUser.onionAddress);
        await this.db.del(oldOnionKey);
      }
      
      // Store the updated user
      return await this.storeUser(user);
    } catch (error) {
      console.error('Error updating user in DHT:', error);
      return false;
    }
  }

  /**
   * Remove a user from the DHT
   * @param {string} userId - The userId to remove
   * @returns {Promise<boolean>} - Success status
   */
  async removeUser(userId) {
    try {
      // Get the user to find all keys to remove
      const user = await this.findUserByUserId(userId);
      if (!user) {
        return false;
      }

      // Remove by userId
      const userIdKey = this.generateKey(userId);
      await this.db.del(userIdKey);

      // Remove by username
      const usernameKey = this.generateKey(user.username.toLowerCase());
      await this.db.del(usernameKey);

      // Remove by onion address if it exists
      if (user.onionAddress) {
        const onionKey = this.generateKey(user.onionAddress);
        await this.db.del(onionKey);
      }

      return true;
    } catch (error) {
      console.error('Error removing user from DHT:', error);
      return false;
    }
  }

  /**
   * List all users in the DHT
   * @returns {Promise<Array>} - Array of user objects
   */
  async listUsers() {
    const users = [];
    const uniqueUserIds = new Set();

    try {
      return new Promise((resolve, reject) => {
        this.db.createReadStream()
          .on('data', (data) => {
            const user = data.value;
            // Only add users once (by userId) and only if they're stored by userId
            if (user.type === 'userId' && !uniqueUserIds.has(user.userId)) {
              uniqueUserIds.add(user.userId);
              users.push(user);
            }
          })
          .on('error', (err) => {
            console.error('Error listing users from DHT:', err);
            reject(err);
          })
          .on('end', () => {
            resolve(users);
          });
      });
    } catch (error) {
      console.error('Error listing users from DHT:', error);
      return [];
    }
  }
}

module.exports = new TorTalkDHT(); 