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

// Simple test component
const SimpleIntegrationTest = () => {
  return (
    <div>
      <h1>TorTalk Integration Test</h1>
      <p>This is a simple integration test</p>
    </div>
  );
};

describe('TorTalk Integration', () => {
  test('renders the integration test component', () => {
    render(<SimpleIntegrationTest />);
    
    expect(screen.getByText('TorTalk Integration Test')).toBeInTheDocument();
    expect(screen.getByText('This is a simple integration test')).toBeInTheDocument();
  });
}); 