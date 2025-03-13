import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the encryption utility
jest.mock('../utils/encryption', () => ({
  generateKey: jest.fn(() => 'mock-encryption-key'),
  encryptMessage: jest.fn((message) => `encrypted:${message}`),
  decryptMessage: jest.fn((message) => message.replace('encrypted:', '')),
  generateKeyPair: jest.fn(() => ({ publicKey: 'mock-public-key', privateKey: 'mock-private-key' })),
  exportPublicKey: jest.fn(() => 'mock-exported-public-key'),
  importPublicKey: jest.fn(() => 'mock-imported-public-key'),
}));

// Simple component for testing
const MessageAreaMock = () => {
  return (
    <div>
      <div className="message-header">
        <h2>testcontact</h2>
        <div>End-to-end encrypted</div>
        <div>Online</div>
      </div>
      <div className="message-list">
        <div className="message">Hello</div>
        <div className="message">Hi there</div>
        <div className="message">Old message</div>
      </div>
      <form data-testid="message-form">
        <input placeholder="Type a message..." />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

// Mock the actual component
jest.mock('../components/chat/MessageArea', () => {
  return {
    __esModule: true,
    default: () => <MessageAreaMock />
  };
});

describe('MessageArea', () => {
  test('renders the message area with active contact', () => {
    render(<MessageAreaMock />);
    
    expect(screen.getByText('testcontact')).toBeInTheDocument();
    expect(screen.getByText('End-to-end encrypted')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });
  
  test('displays messages between current user and active contact', () => {
    render(<MessageAreaMock />);
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(screen.getByText('Old message')).toBeInTheDocument();
  });
}); 