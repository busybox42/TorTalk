const { io } = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');

// Default server URL
const SERVER_URL = 'http://localhost:3001';

// Test configuration
const NUM_CLIENTS = 3;
const DELAY_BETWEEN_TESTS = 1000; // ms

// Store clients
const clients = [];
const clientInfo = [];

// Test results
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

// Create test clients
function createClients() {
  console.log(`Creating ${NUM_CLIENTS} test clients...`);
  
  for (let i = 0; i < NUM_CLIENTS; i++) {
    const port = 3000 + i;
    const userId = `user_${port}_${uuidv4().substring(0, 8)}`;
    const username = `test_user_${port}`;
    
    const socket = io(SERVER_URL);
    
    const clientData = {
      id: i,
      port,
      userId,
      username,
      socket,
      authenticated: false,
      messages: [],
      foundUsers: new Map(),
      messageDeliveryStatus: new Map()
    };
    
    // Set up event handlers
    setupEventHandlers(clientData);
    
    clients.push(socket);
    clientInfo.push(clientData);
    
    console.log(`Created client ${i}: ${username} (${userId})`);
  }
}

// Set up event handlers for a client
function setupEventHandlers(clientData) {
  const { socket, userId, username, id } = clientData;
  
  socket.on('connect', () => {
    console.log(`Client ${id} connected with socket ID: ${socket.id}`);
    
    // Authenticate with the server
    socket.emit('authenticate', {
      userId,
      username,
      publicKey: `fake_public_key_${userId}`
    });
  });
  
  socket.on('authenticated', (data) => {
    if (data.success) {
      console.log(`Client ${id} authenticated successfully`);
      clientData.authenticated = true;
      
      // Check if all clients are authenticated
      if (clientInfo.every(client => client.authenticated)) {
        console.log('All clients authenticated, starting tests...');
        setTimeout(runTests, DELAY_BETWEEN_TESTS);
      }
    } else {
      console.error(`Client ${id} authentication failed:`, data.error);
    }
  });
  
  socket.on('user_found', (user) => {
    console.log(`Client ${id} found user: ${user.username} (${user.userId})`);
    clientData.foundUsers.set(user.userId, user);
  });
  
  socket.on('user_not_found', () => {
    console.log(`Client ${id} received user_not_found response`);
  });
  
  socket.on('private_message', (message) => {
    console.log(`Client ${id} received message from ${message.senderName}: ${message.content}`);
    clientData.messages.push(message);
  });
  
  socket.on('message_delivered', (status) => {
    console.log(`Client ${id} message ${status.messageId} to ${status.recipientId}: ${status.status}`);
    clientData.messageDeliveryStatus.set(status.messageId, status);
  });
  
  socket.on('disconnect', () => {
    console.log(`Client ${id} disconnected from server`);
  });
  
  socket.on('error', (error) => {
    console.error(`Client ${id} socket error:`, error);
  });
}

// Run tests
function runTests() {
  console.log('\n=== RUNNING TESTS ===\n');
  
  // Test 1: User discovery by username
  testUserDiscoveryByUsername();
}

// Test user discovery by username
function testUserDiscoveryByUsername() {
  console.log('\n--- TEST: User Discovery by Username ---\n');
  testsRun++;
  
  // Client 0 looks up Client 1 by username
  const client0 = clientInfo[0];
  const client1 = clientInfo[1];
  
  console.log(`Client ${client0.id} looking up user: ${client1.username}`);
  client0.socket.emit('lookup_user', { username: client1.username });
  
  // Check results after a delay
  setTimeout(() => {
    const foundUser = client0.foundUsers.get(client1.userId);
    
    if (foundUser) {
      console.log(`✅ TEST PASSED: Client ${client0.id} found Client ${client1.id} by username`);
      testsPassed++;
      
      // Continue to next test
      testUserDiscoveryByCaseInsensitiveUsername();
    } else {
      console.log(`❌ TEST FAILED: Client ${client0.id} could not find Client ${client1.id} by username`);
      testsFailed++;
      
      // Continue to next test anyway
      testUserDiscoveryByCaseInsensitiveUsername();
    }
  }, DELAY_BETWEEN_TESTS);
}

// Test user discovery by case-insensitive username
function testUserDiscoveryByCaseInsensitiveUsername() {
  console.log('\n--- TEST: User Discovery by Case-Insensitive Username ---\n');
  testsRun++;
  
  // Client 0 looks up Client 2 by uppercase username
  const client0 = clientInfo[0];
  const client2 = clientInfo[2];
  
  const uppercaseUsername = client2.username.toUpperCase();
  console.log(`Client ${client0.id} looking up user with uppercase: ${uppercaseUsername}`);
  client0.socket.emit('lookup_user', { username: uppercaseUsername });
  
  // Check results after a delay
  setTimeout(() => {
    const foundUser = client0.foundUsers.get(client2.userId);
    
    if (foundUser) {
      console.log(`✅ TEST PASSED: Client ${client0.id} found Client ${client2.id} by case-insensitive username`);
      testsPassed++;
      
      // Continue to next test
      testMessageSending();
    } else {
      console.log(`❌ TEST FAILED: Client ${client0.id} could not find Client ${client2.id} by case-insensitive username`);
      testsFailed++;
      
      // Continue to next test anyway
      testMessageSending();
    }
  }, DELAY_BETWEEN_TESTS);
}

// Test message sending
function testMessageSending() {
  console.log('\n--- TEST: Message Sending ---\n');
  testsRun++;
  
  // Client 1 sends a message to Client 2
  const client1 = clientInfo[1];
  const client2 = clientInfo[2];
  
  const testMessage = {
    senderId: client1.userId,
    senderName: client1.username,
    recipientId: client2.userId,
    content: `Test message from ${client1.username} to ${client2.username}`,
    timestamp: new Date().toISOString(),
    isEncrypted: false
  };
  
  console.log(`Client ${client1.id} sending message to Client ${client2.id}`);
  client1.socket.emit('private_message', testMessage);
  
  // Check results after a delay
  setTimeout(() => {
    // Check if Client 2 received the message
    const receivedMessage = client2.messages.find(msg => 
      msg.senderId === client1.userId && 
      msg.content === testMessage.content
    );
    
    // Check if Client 1 got delivery confirmation
    const deliveryStatus = Array.from(client1.messageDeliveryStatus.values()).find(
      status => status.recipientId === client2.userId && status.status === 'delivered'
    );
    
    if (receivedMessage && deliveryStatus) {
      console.log(`✅ TEST PASSED: Message successfully sent from Client ${client1.id} to Client ${client2.id}`);
      testsPassed++;
    } else {
      console.log(`❌ TEST FAILED: Message sending test failed`);
      if (!receivedMessage) console.log(`  - Client ${client2.id} did not receive the message`);
      if (!deliveryStatus) console.log(`  - Client ${client1.id} did not get delivery confirmation`);
      testsFailed++;
    }
    
    // Finish tests
    finishTests();
  }, DELAY_BETWEEN_TESTS);
}

// Finish tests and report results
function finishTests() {
  console.log('\n=== TEST RESULTS ===');
  console.log(`Total tests: ${testsRun}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log('===================\n');
  
  // Disconnect all clients
  clients.forEach((socket, index) => {
    console.log(`Disconnecting client ${index}...`);
    socket.disconnect();
  });
  
  // Exit with appropriate code
  if (testsFailed > 0) {
    console.log('Some tests failed. Exiting with error code 1.');
    process.exit(1);
  } else {
    console.log('All tests passed! Exiting with success code 0.');
    process.exit(0);
  }
}

// Start the tests
console.log('Starting automated tests for TorTalk');
createClients(); 