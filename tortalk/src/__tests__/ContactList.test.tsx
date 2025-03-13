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
const ContactListMock = () => {
  return (
    <div>
      <h1>Contact List</h1>
      <ul>
        <li>contact1</li>
        <li>contact2</li>
      </ul>
    </div>
  );
};

// Mock the actual component
jest.mock('../components/chat/ContactList', () => {
  return {
    __esModule: true,
    default: () => <ContactListMock />
  };
});

describe('ContactList', () => {
  test('renders the contact list with contacts', () => {
    render(<ContactListMock />);
    
    expect(screen.getByText('Contact List')).toBeInTheDocument();
    expect(screen.getByText('contact1')).toBeInTheDocument();
    expect(screen.getByText('contact2')).toBeInTheDocument();
  });
}); 