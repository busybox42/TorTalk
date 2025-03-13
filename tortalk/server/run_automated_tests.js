const { spawn } = require('child_process');
const path = require('path');

// Configuration
const NUM_CLIENTS = 3;
const BASE_PORT = 3000;
const DELAY_BETWEEN_CLIENTS = 500; // ms
const DELAY_BEFORE_TESTS = 2000; // ms - wait for all clients to authenticate
const TEST_TIMEOUT = 20000; // ms

// Track test results
let clientsStarted = 0;
let clientsCompleted = 0;
let clientsPassed = 0;
let clientsFailed = 0;
const clientProcesses = [];
const clientsAuthenticated = new Set();

console.log(`=== TorTalk Automated Test Runner ===`);
console.log(`Starting ${NUM_CLIENTS} test clients...`);

// Start all clients first, then trigger tests after all are authenticated
for (let i = 0; i < NUM_CLIENTS; i++) {
  startClient(i);
}

// Function to start a client
function startClient(index) {
  const port = BASE_PORT + index;
  // Don't set target yet - we'll do that after all clients are authenticated
  
  console.log(`\n[Client ${index}] Starting client for port ${port}...`);
  
  const clientProcess = spawn('node', [
    path.join(__dirname, 'test_client_automated.js'),
    port.toString(),
    '_waiting_', // Placeholder target - will be updated later
    `Test message from client ${index} (port ${port})`
  ], {
    stdio: 'pipe'
  });
  
  clientProcesses.push(clientProcess);
  clientsStarted++;
  
  // Handle client output
  clientProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(`[Client ${index}] ${output}`);
    
    // Check for authentication
    if (output.includes('Authentication successful!')) {
      clientsAuthenticated.add(index);
      console.log(`[Test Runner] Client ${index} authenticated. Total: ${clientsAuthenticated.size}/${NUM_CLIENTS}`);
      
      // If all clients are authenticated, start the tests
      if (clientsAuthenticated.size === NUM_CLIENTS) {
        console.log(`[Test Runner] All clients authenticated. Starting tests in ${DELAY_BEFORE_TESTS}ms...`);
        setTimeout(startTests, DELAY_BEFORE_TESTS);
      }
    }
    
    // Check for test completion
    if (output.includes('=== TEST RESULTS ===')) {
      clientsCompleted++;
      
      if (output.includes('All tests passed!')) {
        clientsPassed++;
      } else {
        clientsFailed++;
      }
      
      // If all clients have completed, report final results
      if (clientsCompleted === NUM_CLIENTS) {
        reportFinalResults();
      }
    }
  });
  
  // Handle client errors
  clientProcess.stderr.on('data', (data) => {
    console.error(`[Client ${index} ERROR] ${data.toString().trim()}`);
  });
  
  // Handle client exit
  clientProcess.on('exit', (code) => {
    console.log(`[Client ${index}] Exited with code ${code}`);
    
    // If client exited without reporting results, count as failed
    if (!clientProcesses[index].reported) {
      clientsCompleted++;
      clientsFailed++;
      
      // If all clients have completed, report final results
      if (clientsCompleted === NUM_CLIENTS) {
        reportFinalResults();
      }
    }
  });
  
  // Mark as not reported yet
  clientProcess.reported = false;
}

// Start the actual tests by sending commands to each client
function startTests() {
  for (let i = 0; i < NUM_CLIENTS; i++) {
    const targetIndex = (i + 1) % NUM_CLIENTS; // Each client targets the next one in a ring
    const targetPort = BASE_PORT + targetIndex;
    const targetUsername = `test_user_${targetPort}`;
    
    console.log(`[Test Runner] Client ${i} will look for ${targetUsername}`);
    
    // Send the lookup command to the client
    if (clientProcesses[i] && !clientProcesses[i].killed) {
      clientProcesses[i].stdin.write(`lookup:${targetUsername}\n`);
    }
  }
}

// Report final test results
function reportFinalResults() {
  console.log(`\n=== FINAL TEST RESULTS ===`);
  console.log(`Total clients: ${NUM_CLIENTS}`);
  console.log(`Clients passed: ${clientsPassed}`);
  console.log(`Clients failed: ${clientsFailed}`);
  console.log(`========================`);
  
  // Kill any remaining processes
  clientProcesses.forEach((process, index) => {
    if (!process.killed) {
      console.log(`Killing client ${index}...`);
      process.kill();
    }
  });
  
  // Exit with appropriate code
  if (clientsFailed > 0) {
    console.log('Some tests failed. Exiting with error code 1.');
    process.exit(1);
  } else {
    console.log('All tests passed! Exiting with success code 0.');
    process.exit(0);
  }
}

// Set a global timeout for the entire test suite
setTimeout(() => {
  console.error(`\n❌ TEST SUITE TIMED OUT after ${TEST_TIMEOUT}ms`);
  reportFinalResults();
}, TEST_TIMEOUT); 