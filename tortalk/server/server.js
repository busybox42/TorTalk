const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"]
  }
});

// Store connected users
const connectedUsers = new Map();
// Store user public keys
const userPublicKeys = new Map();
// Store all registered users (for lookup even when offline)
const allUsers = new Map();
// Store username to userId mapping for easier lookup
const usernameToId = new Map();

// Debug function to log the state of users
function logUserState() {
  console.log('=== USER STATE DEBUG ===');
  console.log(`Connected users (${connectedUsers.size}): ${Array.from(connectedUsers.keys()).join(', ')}`);
  console.log(`Connected usernames: ${Array.from(connectedUsers.values()).map(u => u.username).join(', ')}`);
  console.log(`User public keys (${userPublicKeys.size}): ${Array.from(userPublicKeys.keys()).join(', ')}`);
  console.log(`All users (${allUsers.size}): ${Array.from(allUsers.keys()).join(', ')}`);
  console.log(`Username to ID mapping (${usernameToId.size}): ${Array.from(usernameToId.entries()).map(([k, v]) => `${k} -> ${v}`).join(', ')}`);
  console.log('========================');
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // User authentication
  socket.on('authenticate', ({ userId, username, publicKey }) => {
    console.log(`User authenticated: ${username} (${userId})`);
    console.log(`Public key received: ${publicKey ? 'Yes' : 'No'}`);
    
    // Store user connection
    connectedUsers.set(userId, {
      socketId: socket.id,
      username,
      userId
    });
    
    // Store user public key
    userPublicKeys.set(userId, publicKey);
    
    // Add to all users map (for lookup even when offline)
    allUsers.set(userId, {
      username,
      publicKey
    });
    
    // Store username to userId mapping (case insensitive)
    usernameToId.set(username.toLowerCase(), userId);
    
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
  socket.on('private_message', ({ senderId, senderName, recipientId, content, timestamp, isEncrypted }) => {
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
    
    // Find recipient's socket
    const recipient = connectedUsers.get(recipientId);
    
    if (recipient) {
      console.log(`Recipient found: ${recipient.username} (${recipient.socketId})`);
      // Send to recipient
      io.to(recipient.socketId).emit('private_message', message);
      
      // Send delivery confirmation to sender
      socket.emit('message_delivered', {
        messageId,
        recipientId,
        status: 'delivered'
      });
    } else {
      console.log(`Recipient not found for ID: ${recipientId}`);
      // Recipient not online, store message for later delivery
      // In a real app, you would store this in a database
      socket.emit('message_delivered', {
        messageId,
        recipientId,
        status: 'pending'
      });
    }
  });
  
  // Handle user lookup (for adding contacts)
  socket.on('lookup_user', ({ username }) => {
    console.log(`Looking up user: ${username}`);
    logUserState();
    
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
        const foundUser = connectedUsers.get(foundUserId) || { userId: foundUserId, username: allUsers.get(foundUserId)?.username || 'Unknown' };
        console.log(`User found by public key: ${foundUser.username} (${foundUser.userId})`);
        socket.emit('user_found', {
          userId: foundUser.userId,
          username: foundUser.username,
          publicKey: userPublicKeys.get(foundUserId) || ''
        });
        return;
      }
    }
    
    // Try to find by username (case insensitive)
    const lowerUsername = username.toLowerCase();
    const userId = usernameToId.get(lowerUsername);
    
    if (userId) {
      console.log(`Found user ID for username ${username}: ${userId}`);
      const userData = allUsers.get(userId);
      const foundUser = connectedUsers.get(userId) || { userId, username: userData?.username || username };
      const publicKey = userPublicKeys.get(userId) || userData?.publicKey || '';
      
      console.log(`User found by username: ${foundUser.username} (${foundUser.userId})`);
      socket.emit('user_found', {
        userId: foundUser.userId,
        username: foundUser.username,
        publicKey
      });
      return;
    }
    
    // If we get here, no user was found
    console.log(`User not found with username: ${username}`);
    socket.emit('user_not_found');
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
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
      
      // Broadcast user offline status
      io.emit('user_status', {
        userId: disconnectedUserId,
        username: disconnectedUser.username,
        status: 'offline'
      });
    }
  });
});

// Start the server on the specified port
function start(port = 3001) {
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// API routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', users: connectedUsers.size });
});

// Export the server functions
module.exports = {
  start
};

// Simple route for testing
app.get('/', (req, res) => {
  res.send('TorTalk WebSocket Server');
}); 