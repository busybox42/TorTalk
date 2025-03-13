/**
 * Tor Service for TorTalk Server
 * This module provides functionality for managing Tor hidden services
 */

const TorControl = require('tor-control');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Ensure the data directory exists
const DATA_DIR = path.join(__dirname, '../data/tor');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class TorService {
  constructor() {
    this.torControl = null;
    this.isConnected = false;
    this.hiddenServices = new Map();
    
    // Default Tor control settings
    this.torControlHost = process.env.TOR_CONTROL_HOST || '127.0.0.1';
    this.torControlPort = parseInt(process.env.TOR_CONTROL_PORT || '9051', 10);
    this.torControlPassword = process.env.TOR_CONTROL_PASSWORD || '';
    
    // Default hidden service settings
    this.hiddenServicePort = parseInt(process.env.HIDDEN_SERVICE_PORT || '3001', 10);
    this.hiddenServiceTarget = process.env.HIDDEN_SERVICE_TARGET || '127.0.0.1:3001';
  }

  /**
   * Connect to the Tor control port
   * @returns {Promise<boolean>} - Success status
   */
  async connect() {
    try {
      if (this.isConnected) {
        return true;
      }

      console.log(`Connecting to Tor control port at ${this.torControlHost}:${this.torControlPort}`);
      
      this.torControl = new TorControl({
        host: this.torControlHost,
        port: this.torControlPort,
        password: this.torControlPassword
      });

      await this.torControl.connect();
      this.isConnected = true;
      console.log('Connected to Tor control port');
      return true;
    } catch (error) {
      console.error('Failed to connect to Tor control port:', error);
      this.isConnected = false;
      
      // If we can't connect to Tor, we'll simulate it for development
      if (process.env.NODE_ENV === 'development') {
        console.log('Running in development mode, simulating Tor connection');
        this.isConnected = true;
        return true;
      }
      
      return false;
    }
  }

  /**
   * Disconnect from the Tor control port
   * @returns {Promise<boolean>} - Success status
   */
  async disconnect() {
    try {
      if (!this.isConnected || !this.torControl) {
        return true;
      }

      await this.torControl.disconnect();
      this.isConnected = false;
      console.log('Disconnected from Tor control port');
      return true;
    } catch (error) {
      console.error('Failed to disconnect from Tor control port:', error);
      return false;
    }
  }

  /**
   * Create a new Tor hidden service
   * @param {string} userId - User ID to associate with the hidden service
   * @param {number} port - Port to expose on the hidden service
   * @param {string} target - Target host:port to forward to
   * @returns {Promise<Object>} - Hidden service info with onion address
   */
  async createHiddenService(userId, port = this.hiddenServicePort, target = this.hiddenServiceTarget) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      // In development mode, generate a fake onion address
      if (process.env.NODE_ENV === 'development') {
        const fakeOnion = this.generateFakeOnionAddress();
        const serviceInfo = {
          userId,
          onionAddress: fakeOnion,
          port,
          target,
          privateKey: crypto.randomBytes(32).toString('hex'),
          createdAt: Date.now()
        };
        
        this.hiddenServices.set(userId, serviceInfo);
        
        // Save to disk for persistence
        this.saveHiddenService(serviceInfo);
        
        console.log(`Created simulated hidden service for ${userId}: ${fakeOnion}`);
        return serviceInfo;
      }

      // Generate a new private key for the hidden service
      const privateKey = crypto.randomBytes(32).toString('base64');
      
      // Create the hidden service
      const response = await this.torControl.createHiddenService({
        port,
        target,
        privateKey
      });

      const serviceInfo = {
        userId,
        onionAddress: response.serviceId + '.onion',
        port,
        target,
        privateKey,
        createdAt: Date.now()
      };

      this.hiddenServices.set(userId, serviceInfo);
      
      // Save to disk for persistence
      this.saveHiddenService(serviceInfo);
      
      console.log(`Created hidden service for ${userId}: ${serviceInfo.onionAddress}`);
      return serviceInfo;
    } catch (error) {
      console.error('Failed to create hidden service:', error);
      throw error;
    }
  }

  /**
   * Remove a Tor hidden service
   * @param {string} userId - User ID associated with the hidden service
   * @returns {Promise<boolean>} - Success status
   */
  async removeHiddenService(userId) {
    try {
      const serviceInfo = this.hiddenServices.get(userId);
      if (!serviceInfo) {
        console.log(`No hidden service found for ${userId}`);
        return false;
      }

      // In development mode, just remove from our map
      if (process.env.NODE_ENV === 'development') {
        this.hiddenServices.delete(userId);
        
        // Remove from disk
        this.deleteHiddenService(userId);
        
        console.log(`Removed simulated hidden service for ${userId}`);
        return true;
      }

      if (!this.isConnected) {
        await this.connect();
      }

      // Remove the hidden service
      await this.torControl.removeHiddenService({
        port: serviceInfo.port
      });

      this.hiddenServices.delete(userId);
      
      // Remove from disk
      this.deleteHiddenService(userId);
      
      console.log(`Removed hidden service for ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to remove hidden service:', error);
      return false;
    }
  }

  /**
   * Get information about a hidden service
   * @param {string} userId - User ID associated with the hidden service
   * @returns {Object|null} - Hidden service info or null if not found
   */
  getHiddenService(userId) {
    return this.hiddenServices.get(userId) || null;
  }

  /**
   * Get all hidden services
   * @returns {Array} - Array of hidden service info objects
   */
  getAllHiddenServices() {
    return Array.from(this.hiddenServices.values());
  }

  /**
   * Generate a fake onion address for development
   * @returns {string} - Fake onion address
   */
  generateFakeOnionAddress() {
    const randomString = crypto.randomBytes(16).toString('hex');
    return `${randomString}.onion`;
  }

  /**
   * Save hidden service info to disk
   * @param {Object} serviceInfo - Hidden service info
   */
  saveHiddenService(serviceInfo) {
    const filePath = path.join(DATA_DIR, `${serviceInfo.userId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(serviceInfo, null, 2));
  }

  /**
   * Delete hidden service info from disk
   * @param {string} userId - User ID associated with the hidden service
   */
  deleteHiddenService(userId) {
    const filePath = path.join(DATA_DIR, `${userId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Load all hidden services from disk
   */
  loadHiddenServices() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        return;
      }

      const files = fs.readdirSync(DATA_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(DATA_DIR, file);
          const serviceInfo = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          this.hiddenServices.set(serviceInfo.userId, serviceInfo);
        }
      }

      console.log(`Loaded ${this.hiddenServices.size} hidden services from disk`);
    } catch (error) {
      console.error('Failed to load hidden services from disk:', error);
    }
  }
}

// Create and export a singleton instance
const torService = new TorService();

// Load existing hidden services on startup
torService.loadHiddenServices();

module.exports = torService; 