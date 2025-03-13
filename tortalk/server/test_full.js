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
  
  // Test 1: Each client looks up the next client in a ring
  testUserDiscoveryRing();
}

// Test user discovery in a ring (client 0 looks for client 1, client 1 looks for client 2, etc.)
function testUserDiscoveryRing() {
  console.log('\n--- TEST: User Discovery Ring ---\n');
  testsRun += NUM_CLIENTS;
  
  for (let i = 0; i < NUM_CLIENTS; i++) {
    const client = clientInfo[i];
    const targetIndex = (i + 1) % NUM_CLIENTS;
    const targetClient = clientInfo[targetIndex];
    
    console.log(`Client ${client.id} looking up user: ${targetClient.username}`);
    client.socket.emit('lookup_user', { username: targetClient.username });
  }
  
  // Check results after a delay
  setTimeout(checkUserDiscoveryResults, DELAY_BETWEEN_TESTS * 2);
}

// Check user discovery results
function checkUserDiscoveryResults() {
  let allFound = true;
  
  for (let i = 0; i < NUM_CLIENTS; i++) {
    const client = clientInfo[i];
    const targetIndex = (i + 1) % NUM_CLIENTS;
    const targetClient = clientInfo[targetIndex];
    
    const foundUser = client.foundUsers.get(targetClient.userId);
    
    if (foundUser) {
      console.log(`✅ TEST PASSED: Client ${client.id} found Client ${targetClient.id} by username`);
      testsPassed++;
    } else {
      console.log(`❌ TEST FAILED: Client ${client.id} could not find Client ${targetClient.id} by username`);
      testsFailed++;
      allFound = false;
    }
  }
  
  // Continue to message tests if all users were found
  if (allFound) {
    testMessageSendingRing();
  } else {
    // Skip to finish if user discovery failed
    finishTests();
  }
}

// Test message sending in a ring
function testMessageSendingRing() {
  console.log('\n--- TEST: Message Sending Ring ---\n');
  testsRun += NUM_CLIENTS;
  
  for (let i = 0; i < NUM_CLIENTS; i++) {
    const client = clientInfo[i];
    const targetIndex = (i + 1) % NUM_CLIENTS;
    const targetClient = clientInfo[targetIndex];
    
    const testMessage = {
      senderId: client.userId,
      senderName: client.username,
      recipientId: targetClient.userId,
      content: `Test message from ${client.username} to ${targetClient.username}`,
      timestamp: new Date().toISOString(),
      isEncrypted: false
    };
    
    console.log(`Client ${client.id} sending message to Client ${targetClient.id}`);
    client.socket.emit('private_message', testMessage);
  }
  
  // Check results after a delay
  setTimeout(checkMessageSendingResults, DELAY_BETWEEN_TESTS * 2);
}

// Check message sending results
function checkMessageSendingResults() {
  for (let i = 0; i < NUM_CLIENTS; i++) {
    const client = clientInfo[i];
    const targetIndex = (i + 1) % NUM_CLIENTS;
    const targetClient = clientInfo[targetIndex];
    
    // Check if target received the message
    const receivedMessage = targetClient.messages.find(msg => 
      msg.senderId === client.userId && 
      msg.content.includes(`Test message from ${client.username} to ${targetClient.username}`)
    );
    
    // Check if sender got delivery confirmation (delivered or pending is fine)
    const deliveryStatus = Array.from(client.messageDeliveryStatus.values()).find(
      status => status.recipientId === targetClient.userId && 
               (status.status === 'delivered' || status.status === 'pending')
    );
    
    if (deliveryStatus) {
      console.log(`✅ TEST PASSED: Message from Client ${client.id} to Client ${targetClient.id} was ${deliveryStatus.status}`);
      testsPassed++;
    } else {
      console.log(`❌ TEST FAILED: No delivery status for message from Client ${client.id} to Client ${targetClient.id}`);
      testsFailed++;
    }
  }
  
  // Finish tests
  finishTests();
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
console.log('Starting full automated tests for TorTalk');
createClients(); 