const { io } = require('socket.io-client');
const readline = require('readline');
const { v4: uuidv4 } = require('uuid');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Default server URL
const SERVER_URL = 'http://localhost:3001';

// Generate a random user ID with port info to simulate different clients
const PORT = process.argv[2] || '3000';
const USER_ID = `user_${PORT}_${uuidv4().substring(0, 8)}`;
const USERNAME = `test_user_${PORT}`;

// Connect to the server
const socket = io(SERVER_URL);

// Store contacts
const contacts = new Map();

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
    console.log('Authentication successful!');
    showMenu();
  } else {
    console.error('Authentication failed:', data.error);
    process.exit(1);
  }
});

// Handle user found response
socket.on('user_found', (user) => {
  console.log(`User found: ${user.username} (${user.userId})`);
  contacts.set(user.userId, {
    username: user.username,
    publicKey: user.publicKey
  });
  showMenu();
});

// Handle user not found response
socket.on('user_not_found', () => {
  console.log('User not found');
  showMenu();
});

// Handle incoming private messages
socket.on('private_message', (message) => {
  console.log(`\n[NEW MESSAGE] From ${message.senderName}: ${message.content}`);
  showMenu();
});

// Handle message delivery status
socket.on('message_delivered', (status) => {
  console.log(`Message ${status.messageId} to ${status.recipientId}: ${status.status}`);
  showMenu();
});

// Handle user status updates
socket.on('user_status', (status) => {
  console.log(`\n[STATUS] User ${status.username} (${status.userId}) is now ${status.status}`);
  showMenu();
});

// Show menu options
function showMenu() {
  console.log('\n--- MENU ---');
  console.log('1. Find user');
  console.log('2. List contacts');
  console.log('3. Send message');
  console.log('4. Exit');
  console.log('------------');
  
  rl.question('Select an option: ', (option) => {
    switch (option) {
      case '1':
        findUser();
        break;
      case '2':
        listContacts();
        break;
      case '3':
        sendMessage();
        break;
      case '4':
        console.log('Exiting...');
        socket.disconnect();
        rl.close();
        process.exit(0);
        break;
      default:
        console.log('Invalid option');
        showMenu();
        break;
    }
  });
}

// Find a user
function findUser() {
  rl.question('Enter username to find: ', (username) => {
    console.log(`Looking up user: ${username}`);
    socket.emit('lookup_user', { username });
  });
}

// List contacts
function listContacts() {
  console.log('\n--- CONTACTS ---');
  if (contacts.size === 0) {
    console.log('No contacts yet');
  } else {
    for (const [userId, contact] of contacts.entries()) {
      console.log(`${contact.username} (${userId})`);
    }
  }
  console.log('----------------');
  showMenu();
}

// Send a message
function sendMessage() {
  if (contacts.size === 0) {
    console.log('No contacts to message. Find a user first.');
    showMenu();
    return;
  }
  
  console.log('\n--- CONTACTS ---');
  const contactArray = Array.from(contacts.entries());
  contactArray.forEach((contact, index) => {
    console.log(`${index + 1}. ${contact[1].username} (${contact[0]})`);
  });
  
  rl.question('Select contact number: ', (contactIndex) => {
    const index = parseInt(contactIndex) - 1;
    if (isNaN(index) || index < 0 || index >= contactArray.length) {
      console.log('Invalid contact number');
      showMenu();
      return;
    }
    
    const recipientId = contactArray[index][0];
    const recipientName = contactArray[index][1].username;
    
    rl.question(`Enter message to send to ${recipientName}: `, (content) => {
      const message = {
        senderId: USER_ID,
        senderName: USERNAME,
        recipientId,
        content,
        timestamp: new Date().toISOString(),
        isEncrypted: false
      };
      
      console.log(`Sending message to ${recipientName} (${recipientId})`);
      socket.emit('private_message', message);
    });
  });
}

// Handle disconnection
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Handle errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Start the client
console.log(`Starting test client for TorTalk (Port: ${PORT})`);
console.log(`Connecting to server at ${SERVER_URL}...`); 