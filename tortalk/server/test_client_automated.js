const { io } = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');

// Default server URL
const SERVER_URL = 'http://localhost:3001';

// Generate a random user ID with port info to simulate different clients
const PORT = process.argv[2] || '3000';
const USER_ID = `user_${PORT}_${uuidv4().substring(0, 8)}`;
const USERNAME = `test_user_${PORT}`;

// Target username to find (from command line or default)
let TARGET_USERNAME = process.argv[3] || `test_user_${3001}`; // Default to looking for port 3001 user
const MESSAGE_CONTENT = process.argv[4] || `Automated test message from ${USERNAME}`;

// Connect to the server
const socket = io(SERVER_URL);

// Store contacts
const contacts = new Map();
let testsPassed = 0;
let testsFailed = 0;
let testsTotal = 3; // Authentication, user discovery, messaging

// Test timeout (ms)
const TEST_TIMEOUT = 10000;
let timeoutId;

// Set up stdin reader for commands
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (line) => {
  if (line.startsWith('lookup:')) {
    const username = line.substring(7).trim();
    TARGET_USERNAME = username;
    console.log(`\n--- TEST: User Discovery ---`);
    console.log(`Looking up user: ${TARGET_USERNAME}`);
    socket.emit('lookup_user', { username: TARGET_USERNAME });
  }
});

// Set a global timeout for the entire test
timeoutId = setTimeout(() => {
  console.error('❌ TEST FAILED: Test timed out after', TEST_TIMEOUT, 'ms');
  reportResults();
  process.exit(1);
}, TEST_TIMEOUT);

// Handle connection
socket.on('connect', () => {
  console.log(`Connected to server with socket ID: ${socket.id}`);
  console.log(`Your user ID: ${USER_ID}`);
  console.log(`Your username: ${USERNAME}`);
  
  // Authenticate with the server
  socket.emit('authenticate', {
    userId: USER_ID,
    username: USERNAME,
    publicKey: `fake_public_key_${USER_ID}`
  });
});

// Handle authentication response
socket.on('authenticated', (data) => {
  if (data.success) {
    console.log('✅ TEST PASSED: Authentication successful!');
    testsPassed++;
    
    // If we're not waiting for commands, start user discovery test
    if (TARGET_USERNAME !== '_waiting_') {
      console.log(`\n--- TEST: User Discovery ---`);
      console.log(`Looking up user: ${TARGET_USERNAME}`);
      socket.emit('lookup_user', { username: TARGET_USERNAME });
    }
  } else {
    console.error('❌ TEST FAILED: Authentication failed:', data.error);
    testsFailed++;
    reportResults();
  }
});

// Handle user found response
socket.on('user_found', (user) => {
  console.log(`✅ TEST PASSED: User found: ${user.username} (${user.userId})`);
  testsPassed++;
  
  contacts.set(user.userId, {
    username: user.username,
    publicKey: user.publicKey
  });
  
  // If we found the target user, send a message
  if (user.username.toLowerCase() === TARGET_USERNAME.toLowerCase()) {
    console.log(`\n--- TEST: Message Sending ---`);
    sendMessage(user.userId, user.username);
  } else {
    // If this isn't our target user, look for the target again
    console.log(`Found a user, but not our target. Looking for: ${TARGET_USERNAME}`);
    socket.emit('lookup_user', { username: TARGET_USERNAME });
  }
});

// Handle user not found response
socket.on('user_not_found', () => {
  console.log(`❌ TEST FAILED: User not found: ${TARGET_USERNAME}`);
  testsFailed++;
  reportResults();
});

// Handle incoming private messages
socket.on('private_message', (message) => {
  console.log(`Received message from ${message.senderName}: ${message.content}`);
});

// Handle message delivery status
socket.on('message_delivered', (status) => {
  console.log(`Message ${status.messageId} to ${status.recipientId}: ${status.status}`);
  
  // Consider both 'delivered' and 'pending' as successful
  // 'pending' means the recipient is not online, which is expected in some test scenarios
  if (status.status === 'delivered' || status.status === 'pending') {
    console.log(`✅ TEST PASSED: Message successfully ${status.status}`);
    testsPassed++;
  } else {
    console.log(`❌ TEST FAILED: Message status unknown (status: ${status.status})`);
    testsFailed++;
  }
  
  // All tests completed
  reportResults();
});

// Handle user status updates
socket.on('user_status', (status) => {
  console.log(`[STATUS] User ${status.username} (${status.userId}) is now ${status.status}`);
});

// Send a message to a specific user
function sendMessage(recipientId, recipientName) {
  const message = {
    senderId: USER_ID,
    senderName: USERNAME,
    recipientId,
    content: MESSAGE_CONTENT,
    timestamp: new Date().toISOString(),
    isEncrypted: false
  };
  
  console.log(`Sending message to ${recipientName} (${recipientId}): ${MESSAGE_CONTENT}`);
  socket.emit('private_message', message);
}

// Report test results and exit
function reportResults() {
  clearTimeout(timeoutId);
  
  console.log('\n=== TEST RESULTS ===');
  console.log(`Total tests: ${testsTotal}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log('===================\n');
  
  // Disconnect and exit
  rl.close();
  socket.disconnect();
  
  if (testsPassed === testsTotal) {
    console.log('All tests passed! Exiting with success code 0.');
    process.exit(0);
  } else {
    console.log('Some tests failed. Exiting with error code 1.');
    process.exit(1);
  }
}

// Handle disconnection
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Handle errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
  testsFailed++;
  reportResults();
});

// Start the client
console.log(`Starting automated test client for TorTalk (Port: ${PORT})`);
console.log(`Connecting to server at ${SERVER_URL}...`);
console.log(`Will look for user: ${TARGET_USERNAME}`); 