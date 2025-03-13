import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatProvider } from '../contexts/ChatContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import MessageArea from '../components/chat/MessageArea';
import ContactList from '../components/chat/ContactList';
import Login from '../components/auth/Login';
import App from '../App';

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

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

// Mock the encryption utility
jest.mock('../utils/encryption', () => ({
  generateKey: jest.fn(() => 'mock-encryption-key'),
  encryptMessage: jest.fn((message) => `encrypted:${message}`),
  decryptMessage: jest.fn((message) => message.replace('encrypted:', '')),
  generateKeyPair: jest.fn(() => ({ publicKey: 'mock-public-key', privateKey: 'mock-private-key' })),
  exportPublicKey: jest.fn(() => 'mock-exported-public-key'),
  importPublicKey: jest.fn(() => 'mock-imported-public-key'),
}));

// Create a mock for the AuthContext that we can control
const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockRegister = jest.fn();

let mockCurrentUser: any = null;
let mockIsAuthenticated = false;

jest.mock('../contexts/AuthContext', () => {
  const originalModule = jest.requireActual('../contexts/AuthContext');
  
  return {
    ...originalModule,
    useAuth: () => ({
      login: mockLogin,
      logout: mockLogout,
      register: mockRegister,
      currentUser: mockCurrentUser,
      isAuthenticated: mockIsAuthenticated
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  };
});

describe('Multi-Client Login Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockCurrentUser = null;
    mockIsAuthenticated = false;
  });

  test('should login as first user', async () => {
    // Setup mock for successful login
    mockLogin.mockImplementation((username, password) => {
      mockCurrentUser = {
        id: 'user1',
        username: username,
        publicKey: 'mock-public-key-user1'
      };
      mockIsAuthenticated = true;
      return Promise.resolve(true);
    });

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    // Fill in login form
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    fireEvent.change(usernameInput, { target: { value: 'user1' } });
    fireEvent.change(passwordInput, { target: { value: 'password1' } });
    
    // Submit form
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    await act(async () => {
      fireEvent.click(loginButton);
    });
    
    // Verify login was called with correct credentials
    expect(mockLogin).toHaveBeenCalledWith('user1', 'password1');
  });

  test('should login as second user', async () => {
    // Setup mock for successful login
    mockLogin.mockImplementation((username, password) => {
      mockCurrentUser = {
        id: 'user2',
        username: username,
        publicKey: 'mock-public-key-user2'
      };
      mockIsAuthenticated = true;
      return Promise.resolve(true);
    });

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    // Fill in login form
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    fireEvent.change(usernameInput, { target: { value: 'user2' } });
    fireEvent.change(passwordInput, { target: { value: 'password2' } });
    
    // Submit form
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    await act(async () => {
      fireEvent.click(loginButton);
    });
    
    // Verify login was called with correct credentials
    expect(mockLogin).toHaveBeenCalledWith('user2', 'password2');
  });

  test('should simulate communication between two clients', async () => {
    // Mock ChatContext for this specific test
    jest.spyOn(require('../contexts/ChatContext'), 'useChat').mockImplementation(() => ({
      messages: [
        {
          id: 'msg1',
          senderId: 'user2',
          senderName: 'User 2',
          recipientId: 'user1',
          content: 'Hello from User 2',
          timestamp: Date.now(),
          isEncrypted: false
        }
      ],
      contacts: [
        {
          id: 'user2',
          username: 'User 2',
          publicKey: 'mock-key-user2',
          onionAddress: 'user2.onion',
          connectionType: 'direct'
        }
      ],
      activeContact: {
        id: 'user2',
        username: 'User 2',
        publicKey: 'mock-key-user2',
        onionAddress: 'user2.onion'
      },
      sendMessage: jest.fn(() => Promise.resolve(true)),
      onlineUsers: new Set(['user2']),
      getConnectionType: jest.fn(() => 'direct'),
      setActiveContact: jest.fn()
    }));

    // Setup mock for user1
    mockCurrentUser = {
      id: 'user1',
      username: 'User 1',
      publicKey: 'mock-public-key-user1'
    };
    mockIsAuthenticated = true;

    // Render the MessageArea component as user1
    render(
      <AuthProvider>
        <ChatProvider>
          <MessageArea />
        </ChatProvider>
      </AuthProvider>
    );

    // Check that user1 can see messages from user2
    expect(screen.getByText('User 2')).toBeInTheDocument();
    expect(screen.getByText('Hello from User 2')).toBeInTheDocument();
    
    // Now let's simulate sending a message back
    const messageInput = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(messageInput, { target: { value: 'Hello from User 1' } });
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    await act(async () => {
      fireEvent.click(sendButton);
    });
    
    // Verify that sendMessage was called
    expect(require('../contexts/ChatContext').useChat().sendMessage).toHaveBeenCalledWith(
      'Hello from User 1',
      'user2'
    );
  });
}); 