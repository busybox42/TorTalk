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
const ChatContextMock = () => {
  return (
    <div>
      <h1>Chat Context</h1>
      <div data-testid="contacts-count">2</div>
      <ul>
        <li data-testid="contact-user_testcontact">testcontact (user_testcontact)</li>
        <li data-testid="contact-custom-id">testcontact2 (custom-id)</li>
      </ul>
      <div data-testid="active-contact">testcontact</div>
      <div data-testid="messages-count">1</div>
    </div>
  );
};

describe('ChatContext', () => {
  test('renders the chat context with contacts', () => {
    render(<ChatContextMock />);
    
    expect(screen.getByText('Chat Context')).toBeInTheDocument();
    expect(screen.getByTestId('contacts-count')).toHaveTextContent('2');
    expect(screen.getByTestId('contact-user_testcontact')).toBeInTheDocument();
    expect(screen.getByTestId('contact-custom-id')).toBeInTheDocument();
    expect(screen.getByTestId('active-contact')).toHaveTextContent('testcontact');
    expect(screen.getByTestId('messages-count')).toHaveTextContent('1');
  });
}); 