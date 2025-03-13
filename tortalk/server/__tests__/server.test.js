const { Server } = require('socket.io');
const Client = require('socket.io-client');
const http = require('http');
const { createServer } = require('http');
const { v4: uuidv4 } = require('uuid');

describe('WebSocket Server', () => {
  let io, serverSocket, clientSocket, httpServer;
  
  beforeAll((done) => {
    // Create HTTP server
    httpServer = createServer();
    
    // Create Socket.IO server
    io = new Server(httpServer);
    
    // Set up server-side socket handlers
    io.on('connection', (socket) => {
      serverSocket = socket;
      
      // User authentication
      socket.on('authenticate', ({ userId, username, publicKey }) => {
        // Store user connection
        connectedUsers.set(userId, {
          socketId: socket.id,
          username,
          userId
        });
        
        // Store user public key
        userPublicKeys.set(userId, publicKey);
        
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
          // Send to recipient
          io.to(recipient.socketId).emit('private_message', message);
          
          // Send delivery confirmation to sender
          socket.emit('message_delivered', {
            messageId,
            recipientId,
            status: 'delivered'
          });
        } else {
          // Recipient not online, store message for later delivery
          socket.emit('message_delivered', {
            messageId,
            recipientId,
            status: 'pending'
          });
        }
      });
      
      // Handle user lookup (for adding contacts)
      socket.on('lookup_user', ({ username }) => {
        // Find user by username
        const foundUser = Array.from(connectedUsers.values()).find(
          user => user.username.toLowerCase() === username.toLowerCase()
        );
        
        if (foundUser) {
          const publicKey = userPublicKeys.get(foundUser.userId) || '';
          
          socket.emit('user_found', {
            userId: foundUser.userId,
            username: foundUser.username,
            publicKey
          });
        } else {
          socket.emit('user_not_found');
        }
      });
    });
    
    // Start the server
    httpServer.listen(() => {
      const port = httpServer.address().port;
      
      // Create client socket
      clientSocket = Client(`http://localhost:${port}`);
      
      // Initialize maps
      global.connectedUsers = new Map();
      global.userPublicKeys = new Map();
      
      clientSocket.on('connect', done);
    });
  });
  
  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });
  
  test('client can authenticate with the server', (done) => {
    // Listen for authentication response
    clientSocket.on('authenticated', (response) => {
      expect(response.success).toBe(true);
      done();
    });
    
    // Send authentication request
    clientSocket.emit('authenticate', {
      userId: 'user_testuser',
      username: 'testuser',
      publicKey: 'mock-public-key'
    });
  });
  
  test('client can look up a user', (done) => {
    // Add a user to the connected users
    connectedUsers.set('user_testuser2', {
      socketId: 'mock-socket-id',
      username: 'testuser2',
      userId: 'user_testuser2'
    });
    
    userPublicKeys.set('user_testuser2', 'mock-public-key-2');
    
    // Listen for user found response
    clientSocket.on('user_found', (user) => {
      expect(user.userId).toBe('user_testuser2');
      expect(user.username).toBe('testuser2');
      expect(user.publicKey).toBe('mock-public-key-2');
      done();
    });
    
    // Send lookup request
    clientSocket.emit('lookup_user', { username: 'testuser2' });
  });
  
  test('client receives not found for non-existent user', (done) => {
    // Listen for user not found response
    clientSocket.on('user_not_found', () => {
      done();
    });
    
    // Send lookup request for non-existent user
    clientSocket.emit('lookup_user', { username: 'nonexistentuser' });
  });
  
  test('client can send a private message', (done) => {
    // Create a second client to receive the message
    const clientSocket2 = Client(`http://localhost:${httpServer.address().port}`);
    
    clientSocket2.on('connect', () => {
      // Authenticate the second client
      clientSocket2.emit('authenticate', {
        userId: 'user_recipient',
        username: 'recipient',
        publicKey: 'mock-public-key-recipient'
      });
      
      // Listen for private message
      clientSocket2.on('private_message', (message) => {
        expect(message.senderId).toBe('user_testuser');
        expect(message.senderName).toBe('testuser');
        expect(message.recipientId).toBe('user_recipient');
        expect(message.content).toBe('Hello, recipient!');
        expect(message.isEncrypted).toBe(true);
        
        clientSocket2.close();
        done();
      });
      
      // Send a private message from the first client to the second
      clientSocket.emit('private_message', {
        senderId: 'user_testuser',
        senderName: 'testuser',
        recipientId: 'user_recipient',
        content: 'Hello, recipient!',
        timestamp: Date.now(),
        isEncrypted: true
      });
    });
  });
  
  test('client receives delivery confirmation for sent message', (done) => {
    // Listen for delivery confirmation
    clientSocket.on('message_delivered', (confirmation) => {
      expect(confirmation.recipientId).toBe('user_recipient');
      expect(confirmation.status).toBe('delivered');
      done();
    });
    
    // Send a private message
    clientSocket.emit('private_message', {
      senderId: 'user_testuser',
      senderName: 'testuser',
      recipientId: 'user_recipient',
      content: 'Another message',
      timestamp: Date.now(),
      isEncrypted: true
    });
  });
  
  test('client receives pending status for offline recipient', (done) => {
    // Listen for delivery confirmation
    clientSocket.on('message_delivered', (confirmation) => {
      expect(confirmation.recipientId).toBe('offline_user');
      expect(confirmation.status).toBe('pending');
      done();
    });
    
    // Send a private message to an offline user
    clientSocket.emit('private_message', {
      senderId: 'user_testuser',
      senderName: 'testuser',
      recipientId: 'offline_user',
      content: 'Message to offline user',
      timestamp: Date.now(),
      isEncrypted: true
    });
  });
}); 