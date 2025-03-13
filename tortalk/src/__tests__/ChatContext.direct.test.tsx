import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatProvider, useChat } from '../contexts/ChatContext';
import { AuthProvider } from '../contexts/AuthContext';

// Mock the socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  };
  return jest.fn(() => mockSocket);
});

// Mock the torService
jest.mock('../services/torService', () => ({
  connect: jest.fn(() => Promise.resolve(true)),
  disconnect: jest.fn(() => Promise.resolve(true)),
  isConnectedToTor: jest.fn(() => true),
  createHiddenService: jest.fn(() => Promise.resolve({
    userId: 'test_user',
    onionAddress: 'test123.onion',
    port: 8080,
    createdAt: Date.now()
  })),
  getHiddenService: jest.fn(() => ({
    userId: 'test_user',
    onionAddress: 'test123.onion',
    port: 8080,
    createdAt: Date.now()
  })),
  sendDirectMessage: jest.fn(() => Promise.resolve(true)),
  registerMessageHandler: jest.fn(),
  unregisterMessageHandler: jest.fn(),
  getSettings: jest.fn(() => ({
    autoConnect: true,
    useHiddenService: true,
    hiddenServicePort: 8080
  }))
}));

// Mock the encryption utility
jest.mock('../utils/encryption', () => ({
  generateKey: jest.fn(() => 'mock-encryption-key'),
  encryptMessage: jest.fn((message) => `encrypted:${message}`),
  decryptMessage: jest.fn((message) => message.replace('encrypted:', '')),
  generateKeyPair: jest.fn(() => ({ publicKey: 'mock-public-key', privateKey: 'mock-private-key' })),
  exportPublicKey: jest.fn(() => 'mock-exported-public-key'),
  importPublicKey: jest.fn(() => 'mock-imported-public-key'),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock AuthContext
jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    currentUser: {
      id: 'test_user',
      username: 'testuser',
      publicKey: 'mock-public-key'
    },
    isAuthenticated: true
  })
}));

// Simplified test component
const TestComponent = () => {
  const { contacts, getConnectionType } = useChat();

  return (
    <div>
      <div data-testid="contacts-count">{contacts.length}</div>
      {contacts.map(contact => (
        <div key={contact.id} data-testid={`contact-${contact.id}`}>
          {contact.username} - {getConnectionType(contact.id)}
        </div>
      ))}
    </div>
  );
};

describe('ChatContext Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Set up mock contacts in localStorage
    localStorageMock.setItem('tortalk_contacts', JSON.stringify([
      {
        id: 'contact1',
        username: 'contact1',
        publicKey: 'mock-public-key',
        onionAddress: 'contact1.onion',
        connectionType: 'server'
      },
      {
        id: 'contact2',
        username: 'contact2',
        publicKey: 'mock-public-key'
      }
    ]));
    
    // Set up mock messages
    localStorageMock.setItem('tortalk_messages', JSON.stringify([
      {
        id: 'msg1',
        senderId: 'contact1',
        senderName: 'contact1',
        recipientId: 'test_user',
        content: 'Hello from contact1',
        timestamp: Date.now(),
        isEncrypted: false
      }
    ]));
  });

  test('should connect to Tor', async () => {
    render(
      <AuthProvider>
        <ChatProvider>
          <TestComponent />
        </ChatProvider>
      </AuthProvider>
    );

    // Initially disconnected
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');

    // Connect to Tor
    await act(async () => {
      screen.getByTestId('connect-button').click();
    });

    // Should be connected now
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
    });

    // Verify torService.connect was called
    expect(torService.connect).toHaveBeenCalled();
  });

  test('should create a hidden service', async () => {
    render(
      <AuthProvider>
        <ChatProvider>
          <TestComponent />
        </ChatProvider>
      </AuthProvider>
    );

    // Connect to Tor first
    await act(async () => {
      screen.getByTestId('connect-button').click();
    });

    // Create hidden service
    await act(async () => {
      screen.getByTestId('create-service-button').click();
    });

    // Verify torService.createHiddenService was called
    expect(torService.createHiddenService).toHaveBeenCalled();
  });

  test('should send a direct message', async () => {
    // Mock the sendDirectMessage to succeed
    (torService.sendDirectMessage as jest.Mock).mockResolvedValue(true);

    render(
      <AuthProvider>
        <ChatProvider>
          <TestComponent />
        </ChatProvider>
      </AuthProvider>
    );

    // Connect to Tor first
    await act(async () => {
      screen.getByTestId('connect-button').click();
    });

    // Send a direct message
    await act(async () => {
      screen.getByTestId('send-direct-button').click();
    });

    // Verify message was added to state
    await waitFor(() => {
      expect(screen.getByTestId('messages-count')).not.toHaveTextContent('0');
    });
  });

  test('should determine connection type correctly', async () => {
    render(
      <AuthProvider>
        <ChatProvider>
          <TestComponent />
        </ChatProvider>
      </AuthProvider>
    );

    // Wait for contacts to load
    await waitFor(() => {
      expect(screen.getByTestId('contacts-count')).toHaveTextContent('2');
    });

    // Check connection types
    expect(screen.getByTestId('contact-contact1')).toHaveTextContent('contact1 - server');
    expect(screen.getByTestId('contact-contact2')).toHaveTextContent('contact2 - unknown');
  });

  test('should register message handlers when connected', async () => {
    render(
      <AuthProvider>
        <ChatProvider>
          <TestComponent />
        </ChatProvider>
      </AuthProvider>
    );

    // Connect to Tor
    await act(async () => {
      screen.getByTestId('connect-button').click();
    });

    // Wait for connection
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
    });

    // Verify registerMessageHandler was called
    expect(torService.registerMessageHandler).toHaveBeenCalledWith('chat_message', expect.any(Function));
  });
}); 