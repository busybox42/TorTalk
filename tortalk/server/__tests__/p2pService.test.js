/**
 * Unit tests for the P2P service
 */

const p2pService = require('../lib/p2pService');

// Set environment to development for testing
process.env.NODE_ENV = 'development';

describe('P2PService', () => {
  // Test message data
  const testMessage = {
    content: 'Test message content',
    timestamp: Date.now(),
    isEncrypted: true
  };

  // Test sender and recipient
  const testSender = {
    userId: 'sender_123',
    username: 'sender',
    onionAddress: 'sender123.onion'
  };

  const testRecipient = {
    userId: 'recipient_456',
    username: 'recipient',
    onionAddress: 'recipient456.onion',
    port: 8080
  };

  // Mock Socket.io for testing
  const mockIo = {
    sockets: {
      sockets: new Map()
    }
  };

  // Mock socket for testing
  const mockSocket = {
    userId: testRecipient.userId,
    emit: jest.fn()
  };

  // Add mock socket to the sockets map
  mockIo.sockets.sockets.set('socket_id', mockSocket);

  test('should send a direct message in development mode', async () => {
    const result = await p2pService.sendDirectMessage(testMessage, testSender, testRecipient);
    
    expect(result).toBeTruthy();
    expect(result.success).toBe(true);
    expect(result.messageId).toBeTruthy();
    expect(result.method).toBe('direct');
    expect(result.timestamp).toBeTruthy();
  });

  test('should relay a message', async () => {
    const result = await p2pService.relayMessage(testMessage, testSender, testRecipient);
    
    expect(result).toBeTruthy();
    expect(result.success).toBe(true);
    expect(result.messageId).toBeTruthy();
    expect(result.method).toBe('relay');
    expect(result.relayId).toBeTruthy();
    expect(result.timestamp).toBeTruthy();
  });

  test('should find a recipient socket', () => {
    const socket = p2pService.findRecipientSocket(mockIo, testRecipient.userId);
    expect(socket).toBe(mockSocket);
  });

  test('should return null for non-existent recipient socket', () => {
    const socket = p2pService.findRecipientSocket(mockIo, 'nonexistent_user');
    expect(socket).toBeNull();
  });

  test('should register and trigger a message callback', () => {
    const mockCallback = jest.fn();
    const messageId = 'test_message_id';
    const status = { success: true };
    
    p2pService.registerMessageCallback(messageId, mockCallback);
    p2pService.triggerMessageCallback(messageId, status);
    
    expect(mockCallback).toHaveBeenCalledWith(status);
  });

  test('should not trigger a non-existent callback', () => {
    const messageId = 'nonexistent_message_id';
    const status = { success: true };
    
    // This should not throw an error
    p2pService.triggerMessageCallback(messageId, status);
  });

  test('should deliver a relayed message', async () => {
    // Create a relay object
    const relayId = 'test_relay_id';
    const relay = {
      message: {
        id: 'test_message_id',
        content: 'Test relayed message'
      },
      sender: testSender,
      recipient: testRecipient,
      attempts: 0,
      delivered: false,
      timestamp: Date.now()
    };
    
    await p2pService.deliverRelayedMessage(mockIo, relayId, relay);
    
    expect(relay.attempts).toBe(1);
    expect(relay.delivered).toBe(true);
    expect(relay.lastAttempt).toBeTruthy();
    expect(mockSocket.emit).toHaveBeenCalledWith('private_message', relay.message);
  });
}); 