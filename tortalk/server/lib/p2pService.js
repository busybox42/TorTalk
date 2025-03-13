/**
 * Peer-to-Peer Messaging Service for TorTalk
 * This module provides functionality for direct communication between users
 */

const http = require('http');
const https = require('https');
const url = require('url');
const dht = require('./dht');
const torService = require('./torService');

class P2PService {
  constructor() {
    this.relayMessages = new Map(); // Store messages for relay when direct communication fails
    this.messageCallbacks = new Map(); // Callbacks for message delivery status
  }

  /**
   * Send a message directly to a recipient
   * @param {Object} message - Message object
   * @param {Object} sender - Sender information
   * @param {Object} recipient - Recipient information
   * @returns {Promise<Object>} - Delivery status
   */
  async sendDirectMessage(message, sender, recipient) {
    try {
      if (!recipient.onionAddress) {
        throw new Error('Recipient onion address not available');
      }

      // Generate a unique message ID if not provided
      if (!message.id) {
        message.id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }

      // Add sender information to the message
      message.senderId = sender.userId;
      message.senderName = sender.username;
      message.senderOnion = sender.onionAddress;
      message.timestamp = message.timestamp || Date.now();

      // In development mode, simulate direct message delivery
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Simulating direct message from ${sender.username} to ${recipient.username}`);
        
        // Simulate a delay for network latency
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
          success: true,
          messageId: message.id,
          method: 'direct',
          timestamp: Date.now()
        };
      }

      // Construct the target URL
      const targetUrl = `http://${recipient.onionAddress}:${recipient.port || 80}/message`;
      
      // Send the message
      const response = await this.makeRequest(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message),
        timeout: 10000 // 10 second timeout
      });

      return {
        success: true,
        messageId: message.id,
        method: 'direct',
        response,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to send direct message:', error);
      
      // Fall back to relay if direct communication fails
      return this.relayMessage(message, sender, recipient);
    }
  }

  /**
   * Relay a message through the server when direct communication fails
   * @param {Object} message - Message object
   * @param {Object} sender - Sender information
   * @param {Object} recipient - Recipient information
   * @returns {Promise<Object>} - Delivery status
   */
  async relayMessage(message, sender, recipient) {
    try {
      // Store the message for relay
      const relayId = `relay_${message.id}`;
      this.relayMessages.set(relayId, {
        message,
        sender,
        recipient,
        timestamp: Date.now(),
        attempts: 0,
        delivered: false
      });

      console.log(`Message from ${sender.username} to ${recipient.username} queued for relay`);

      return {
        success: true,
        messageId: message.id,
        method: 'relay',
        relayId,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to relay message:', error);
      return {
        success: false,
        messageId: message.id,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Process relayed messages
   * @param {Object} io - Socket.io instance for delivering relayed messages
   */
  processRelayedMessages(io) {
    // Process relayed messages every 5 seconds
    setInterval(() => {
      const now = Date.now();
      
      for (const [relayId, relay] of this.relayMessages.entries()) {
        // Skip messages that have been delivered
        if (relay.delivered) {
          // Remove delivered messages after 1 hour
          if (now - relay.timestamp > 3600000) {
            this.relayMessages.delete(relayId);
          }
          continue;
        }

        // Skip messages that have been attempted too many times
        if (relay.attempts >= 5) {
          console.log(`Giving up on relaying message ${relay.message.id} after ${relay.attempts} attempts`);
          relay.delivered = false;
          continue;
        }

        // Skip messages that were attempted recently (retry every 30 seconds)
        if (relay.lastAttempt && now - relay.lastAttempt < 30000) {
          continue;
        }

        // Try to deliver the message
        this.deliverRelayedMessage(io, relayId, relay);
      }
    }, 5000);
  }

  /**
   * Deliver a relayed message
   * @param {Object} io - Socket.io instance
   * @param {string} relayId - Relay ID
   * @param {Object} relay - Relay information
   */
  async deliverRelayedMessage(io, relayId, relay) {
    try {
      relay.attempts += 1;
      relay.lastAttempt = Date.now();

      // Find the recipient's socket
      const recipientSocket = this.findRecipientSocket(io, relay.recipient.userId);
      
      if (recipientSocket) {
        // Deliver the message through Socket.io
        recipientSocket.emit('private_message', relay.message);
        
        // Mark as delivered
        relay.delivered = true;
        console.log(`Relayed message ${relay.message.id} delivered to ${relay.recipient.username}`);
        
        // Notify the sender if they're connected
        const senderSocket = this.findRecipientSocket(io, relay.sender.userId);
        if (senderSocket) {
          senderSocket.emit('message_delivered', {
            messageId: relay.message.id,
            recipientId: relay.recipient.userId,
            status: 'delivered',
            method: 'relay'
          });
        }
      } else {
        console.log(`Recipient ${relay.recipient.username} not connected, will retry later`);
      }
    } catch (error) {
      console.error(`Failed to deliver relayed message ${relayId}:`, error);
    }
  }

  /**
   * Find a recipient's socket
   * @param {Object} io - Socket.io instance
   * @param {string} userId - User ID
   * @returns {Object|null} - Socket.io socket or null if not found
   */
  findRecipientSocket(io, userId) {
    // This is a simplified implementation
    // In a real app, you would maintain a mapping of user IDs to socket IDs
    for (const [socketId, socket] of io.sockets.sockets.entries()) {
      if (socket.userId === userId) {
        return socket;
      }
    }
    return null;
  }

  /**
   * Make an HTTP request
   * @param {string} requestUrl - URL to request
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response
   */
  makeRequest(requestUrl, options = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(requestUrl);
      const httpModule = parsedUrl.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.path,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: options.timeout || 30000
      };

      const req = httpModule.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = {
              statusCode: res.statusCode,
              headers: res.headers,
              body: data
            };
            
            if (res.headers['content-type']?.includes('application/json')) {
              response.body = JSON.parse(data);
            }
            
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  /**
   * Register a callback for message delivery status
   * @param {string} messageId - Message ID
   * @param {Function} callback - Callback function
   */
  registerMessageCallback(messageId, callback) {
    this.messageCallbacks.set(messageId, callback);
    
    // Clean up callback after 1 hour
    setTimeout(() => {
      this.messageCallbacks.delete(messageId);
    }, 3600000);
  }

  /**
   * Trigger a message callback
   * @param {string} messageId - Message ID
   * @param {Object} status - Delivery status
   */
  triggerMessageCallback(messageId, status) {
    const callback = this.messageCallbacks.get(messageId);
    if (callback) {
      callback(status);
    }
  }
}

// Create and export a singleton instance
const p2pService = new P2PService();
module.exports = p2pService; 