import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageArea from '../components/chat/MessageArea';

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock the contexts
const mockGetConnectionType = jest.fn();
const mockSendMessage = jest.fn();
const mockMessages = [
  {
    id: 'msg1',
    senderId: 'contact1',
    senderName: 'Contact 1',
    recipientId: 'user1',
    content: 'Hello from contact',
    timestamp: Date.now(),
    isEncrypted: false
  },
  {
    id: 'msg2',
    senderId: 'user1',
    senderName: 'Current User',
    recipientId: 'contact1',
    content: 'Hello from user',
    timestamp: Date.now(),
    isEncrypted: false
  }
];

jest.mock('../contexts/ChatContext', () => ({
  useChat: () => ({
    messages: mockMessages,
    activeContact: {
      id: 'contact1',
      username: 'Contact 1',
      publicKey: 'mock-key',
      onionAddress: 'mock.onion'
    },
    sendMessage: mockSendMessage,
    onlineUsers: new Set(['contact1']),
    getConnectionType: mockGetConnectionType
  })
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'user1',
      username: 'Current User',
      publicKey: 'mock-key'
    }
  })
}));

describe('MessageArea Component', () => {
  test('renders with direct connection', () => {
    mockGetConnectionType.mockReturnValue('direct');
    
    render(<MessageArea />);
    
    // Check for basic elements
    expect(screen.getByText('Contact 1')).toBeInTheDocument();
    expect(screen.getByText('End-to-end encrypted')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    
    // Check for connection type
    const connectionChip = screen.getByText('Direct');
    expect(connectionChip).toBeInTheDocument();
    
    // Check for messages
    expect(screen.getByText('Hello from contact')).toBeInTheDocument();
    expect(screen.getByText('Hello from user')).toBeInTheDocument();
  });

  test('renders with server connection', () => {
    mockGetConnectionType.mockReturnValue('server');
    
    render(<MessageArea />);
    
    // Check for connection type
    const connectionChip = screen.getByText('Server');
    expect(connectionChip).toBeInTheDocument();
  });
}); 