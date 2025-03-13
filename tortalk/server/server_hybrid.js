/**
 * TorTalk Hybrid Server
 * This server provides both centralized discovery and relay functionality,
 * as well as support for direct peer-to-peer communication over Tor.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Import our custom services
const dht = require('./lib/dht');
const torService = require('./lib/torService');
const p2pService = require('./lib/p2pService');

// Set development mode for testing
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'development';
  console.log('Running in development mode');
}

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from any origin
    methods: ["GET", "POST"]
  }
});

// Store connected users
const connectedUsers = new Map();
// Store user public keys
const userPublicKeys = new Map();
// Store username to userId mapping for quick lookup
const usernameToUserId = new Map();

// Debug function to log the state of users
function logUserState() {
  console.log('=== USER STATE DEBUG ===');
  console.log(`Connected users (${connectedUsers.size}): ${Array.from(connectedUsers.keys()).join(', ')}`);
  console.log(`Connected usernames: ${Array.from(connectedUsers.values()).map(u => u.username).join(', ')}`);
  console.log(`User public keys (${userPublicKeys.size}): ${Array.from(userPublicKeys.keys()).join(', ')}`);
  console.log(`Username to UserId mapping (${usernameToUserId.size}): ${Array.from(usernameToUserId.entries()).map(([k, v]) => `${k} -> ${v}`).join(', ')}`);
  console.log('========================');
}

// REST API routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: process.env.NODE_ENV });
});

// Get user info endpoint
app.get('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Look up user in DHT
    const user = await dht.findUserByUsername(username);
    
    if (user) {
      // Return user info without sensitive data
      res.json({
        userId: user.userId,
        username: user.username,
        publicKey: user.publicKey,
        onionAddress: user.onionAddress,
        isOnline: connectedUsers.has(user.userId)
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Message relay endpoint (for direct P2P communication)
app.post('/api/relay', async (req, res) => {
  try {
    const { message, senderId, recipientId } = req.body;
    
    if (!message || !senderId || !recipientId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Look up sender and recipient
    const sender = await dht.findUserByUserId(senderId);
    const recipient = await dht.findUserByUserId(recipientId);
    
    if (!sender || !recipient) {
      return res.status(404).json({ error: 'Sender or recipient not found' });
    }
    
    // Relay the message
    const result = await p2pService.relayMessage(message, sender, recipient);
    
    res.json(result);
  } catch (error) {
    console.error('Error relaying message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register Tor hidden service endpoint
app.post('/api/tor/register', async (req, res) => {
  try {
    const { userId, port } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create hidden service
    const service = await torService.createHiddenService(userId, port);
    
    // Update user in DHT with onion address
    const user = await dht.findUserByUserId(userId);
    if (user) {
      await dht.updateUser({
        ...user,
        onionAddress: service.onionAddress
      });
    }
    
    res.json({
      userId,
      onionAddress: service.onionAddress,
      port: service.port
    });
  } catch (error) {
    console.error('Error registering Tor hidden service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // User authentication
  socket.on('authenticate', async ({ userId, username, publicKey, onionAddress }) => {
    console.log(`User authenticated: ${username} (${userId})`);
    console.log(`Public key received: ${publicKey ? 'Yes' : 'No'}`);
    console.log(`Onion address received: ${onionAddress || 'No'}`);
    
    // Store user connection
    connectedUsers.set(userId, {
      socketId: socket.id,
      username,
      userId
    });
    
    // Store user public key
    userPublicKeys.set(userId, publicKey);
    
    // Store username to userId mapping (both original and lowercase)
    usernameToUserId.set(username, userId);
    usernameToUserId.set(username.toLowerCase(), userId);
    
    // Store user ID in socket for easy lookup
    socket.userId = userId;
    
    // Store user in DHT
    await dht.storeUser({
      userId,
      username,
      publicKey,
      onionAddress,
      lastSeen: Date.now()
    });
    
    // Log the current state
    logUserState();
    
    // Notify user of successful authentication
    socket.emit('authenticated', { success: true });
    
    // Broadcast user online status to all connected users
    io.emit('user_status', {
      userId,
      username,
      status: 'online'
    });
  });
  
  // Handle private messages
  socket.on('private_message', async ({ senderId, senderName, recipientId, content, timestamp, isEncrypted }) => {
    console.log(`Message from ${senderName} (${senderId}) to recipient ID: ${recipientId}`);
    console.log(`Connected users: ${Array.from(connectedUsers.keys()).join(', ')}`);
    
    // Generate a unique message ID
    const messageId = uuidv4();
    
    // Create message object
    const message = {
      id: messageId,
      senderId,
      senderName,
      recipientId,
      content,
      timestamp,
      isEncrypted
    };
    
    // Look up sender and recipient in DHT
    const sender = await dht.findUserByUserId(senderId);
    const recipient = await dht.findUserByUserId(recipientId);
    
    // If both users have onion addresses, try direct communication first
    if (sender && recipient && sender.onionAddress && recipient.onionAddress) {
      try {
        console.log(`Attempting direct P2P message from ${sender.username} to ${recipient.username}`);
        
        // Try to send directly
        const result = await p2pService.sendDirectMessage(message, sender, recipient);
        
        if (result.success && result.method === 'direct') {
          console.log(`Direct P2P message delivered successfully`);
          
          // Send delivery confirmation to sender
          socket.emit('message_delivered', {
            messageId,
            recipientId,
            status: 'delivered',
            method: 'direct'
          });
          
          return;
        }
        
        // If we're here, direct delivery failed and we're using relay
        console.log(`Direct P2P message failed, using relay`);
      } catch (error) {
        console.error('Error sending direct P2P message:', error);
      }
    }
    
    // Fall back to traditional Socket.io relay
    const recipientSocket = connectedUsers.get(recipientId);
    
    if (recipientSocket) {
      console.log(`Recipient found: ${recipientSocket.username} (${recipientSocket.socketId})`);
      // Send to recipient
      io.to(recipientSocket.socketId).emit('private_message', message);
      
      // Send delivery confirmation to sender
      socket.emit('message_delivered', {
        messageId,
        recipientId,
        status: 'delivered',
        method: 'server'
      });
    } else {
      console.log(`Recipient not found for ID: ${recipientId}`);
      // Recipient not online, store message for later delivery
      // In a real app, you would store this in a database
      socket.emit('message_delivered', {
        messageId,
        recipientId,
        status: 'pending',
        method: 'server'
      });
    }
  });
  
  // Handle user lookup (for adding contacts)
  socket.on('lookup_user', async ({ username }) => {
    console.log(`Looking up user: ${username}`);
    logUserState();
    
    try {
      // Look up user in DHT
      const user = await dht.findUserByUsername(username.toLowerCase());
      
      if (user) {
        console.log(`User found in DHT: ${user.username} (${user.userId})`);
        
        socket.emit('user_found', {
          userId: user.userId,
          username: user.username,
          publicKey: user.publicKey || '',
          onionAddress: user.onionAddress || ''
        });
        return;
      }
      
      // If not found in DHT, try traditional lookup
      // Check if the input looks like a public key (long string)
      const isLikelyPublicKey = username.length > 40;
      if (isLikelyPublicKey) {
        console.log(`Input looks like a public key, searching by public key instead`);
        
        // Find user by public key
        let foundUserId = null;
        for (const [userId, publicKey] of userPublicKeys.entries()) {
          if (publicKey === username) {
            foundUserId = userId;
            break;
          }
        }
        
        if (foundUserId) {
          const foundUser = connectedUsers.get(foundUserId);
          if (foundUser) {
            console.log(`User found by public key: ${foundUser.username} (${foundUser.userId})`);
            socket.emit('user_found', {
              userId: foundUser.userId,
              username: foundUser.username,
              publicKey: userPublicKeys.get(foundUserId) || ''
            });
            return;
          }
        }
      }
      
      // Try to find by userId directly
      if (connectedUsers.has(username)) {
        const foundUser = connectedUsers.get(username);
        console.log(`User found by direct userId: ${foundUser.username} (${foundUser.userId})`);
        
        socket.emit('user_found', {
          userId: foundUser.userId,
          username: foundUser.username,
          publicKey: userPublicKeys.get(foundUser.userId) || ''
        });
        return;
      }
      
      // Try to find by username (case insensitive)
      const lowerUsername = username.toLowerCase();
      const userId = usernameToUserId.get(lowerUsername);
      
      if (userId) {
        console.log(`Found userId ${userId} for username ${username}`);
        
        // Get user data
        const foundUser = connectedUsers.get(userId);
        
        if (foundUser) {
          console.log(`User found by username mapping: ${foundUser.username} (${userId})`);
          
          socket.emit('user_found', {
            userId: userId,
            username: foundUser.username,
            publicKey: userPublicKeys.get(userId) || ''
          });
          return;
        }
      }
      
      // Find user by username (case insensitive) in connected users as fallback
      const foundUser = Array.from(connectedUsers.values()).find(
        user => user.username.toLowerCase() === lowerUsername
      );
      
      if (foundUser) {
        console.log(`User found by username in connected users: ${foundUser.username} (${foundUser.userId})`);
        const publicKey = userPublicKeys.get(foundUser.userId) || '';
        
        socket.emit('user_found', {
          userId: foundUser.userId,
          username: foundUser.username,
          publicKey
        });
      } else {
        console.log(`User not found with username: ${username}`);
        socket.emit('user_not_found');
      }
    } catch (error) {
      console.error('Error looking up user:', error);
      socket.emit('user_not_found');
    }
  });
  
  // Register Tor hidden service
  socket.on('register_tor', async ({ userId, port }) => {
    try {
      if (!userId) {
        socket.emit('tor_registered', { success: false, error: 'Missing userId' });
        return;
      }
      
      // Create hidden service
      const service = await torService.createHiddenService(userId, port);
      
      // Update user in DHT with onion address
      const user = await dht.findUserByUserId(userId);
      if (user) {
        await dht.updateUser({
          ...user,
          onionAddress: service.onionAddress
        });
      }
      
      socket.emit('tor_registered', {
        success: true,
        userId,
        onionAddress: service.onionAddress,
        port: service.port
      });
    } catch (error) {
      console.error('Error registering Tor hidden service:', error);
      socket.emit('tor_registered', { success: false, error: error.message });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find the disconnected user
    let disconnectedUserId = null;
    
    for (const [userId, user] of connectedUsers.entries()) {
      if (user.socketId === socket.id) {
        disconnectedUserId = userId;
        break;
      }
    }
    
    if (disconnectedUserId) {
      const disconnectedUser = connectedUsers.get(disconnectedUserId);
      
      // Remove user from connected users
      connectedUsers.delete(disconnectedUserId);
      
      // Update user in DHT with last seen time
      try {
        const user = await dht.findUserByUserId(disconnectedUserId);
        if (user) {
          await dht.updateUser({
            ...user,
            lastSeen: Date.now()
          });
        }
      } catch (error) {
        console.error('Error updating user last seen time:', error);
      }
      
      // Broadcast user offline status
      io.emit('user_status', {
        userId: disconnectedUserId,
        username: disconnectedUser.username,
        status: 'offline'
      });
    }
  });
});

// Start processing relayed messages
p2pService.processRelayedMessages(io);

// Start the server
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mode: ${process.env.NODE_ENV}`);
}); 