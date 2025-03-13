console.log('Running test...');

// A simple test
function add(a, b) {
  return a + b;
}

// Test the add function
const result = add(1, 2);
if (result === 3) {
  console.log('Test passed!');
} else {
  console.error('Test failed!');
  process.exit(1);
}

console.log('All tests passed!'); 