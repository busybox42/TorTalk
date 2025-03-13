import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageArea from '../components/chat/MessageArea';
import ContactList from '../components/chat/ContactList';

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock the contexts
jest.mock('../contexts/ChatContext', () => ({
  useChat: () => ({
    messages: [
      {
        id: 'msg1',
        senderId: 'contact1',
        senderName: 'Direct Contact',
        recipientId: 'user1',
        content: 'Hello via direct connection',
        timestamp: Date.now(),
        isEncrypted: false
      }
    ],
    contacts: [
      {
        id: 'contact1',
        username: 'Direct Contact',
        publicKey: 'mock-key',
        onionAddress: 'mock.onion',
        connectionType: 'direct'
      }
    ],
    activeContact: {
      id: 'contact1',
      username: 'Direct Contact',
      publicKey: 'mock-key',
      onionAddress: 'mock.onion'
    },
    sendMessage: jest.fn(),
    onlineUsers: new Set(['contact1']),
    getConnectionType: jest.fn(() => 'direct'),
    setActiveContact: jest.fn()
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

describe('Direct Messaging Integration', () => {
  test('renders ContactList component', () => {
    render(<ContactList />);
    
    // Check that ContactList renders
    expect(screen.getByText('Direct Contact')).toBeInTheDocument();
  });
  
  test('renders MessageArea component', () => {
    render(<MessageArea />);
    
    // Check that MessageArea renders
    expect(screen.getByText('Direct Contact')).toBeInTheDocument();
    expect(screen.getByText('Direct')).toBeInTheDocument();
    expect(screen.getByText('Hello via direct connection')).toBeInTheDocument();
  });
}); 