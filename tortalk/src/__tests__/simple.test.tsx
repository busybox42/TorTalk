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
const SimpleComponent = () => {
  return (
    <div>
      <h1>Simple Test Component</h1>
      <p>This is a simple test component</p>
    </div>
  );
};

describe('Simple Component', () => {
  test('renders the simple component', () => {
    render(<SimpleComponent />);
    
    expect(screen.getByText('Simple Test Component')).toBeInTheDocument();
    expect(screen.getByText('This is a simple test component')).toBeInTheDocument();
  });
}); 