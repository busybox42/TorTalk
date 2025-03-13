// Mock implementation of encryption utilities for testing

// Generate a mock encryption key
export const generateKey = (): string => {
  return 'mock-encryption-key';
};

// Mock encrypt a message
export const encryptMessage = (message: string, key: string): string => {
  return `encrypted:${message}`;
};

// Mock decrypt a message
export const decryptMessage = (encryptedMessage: string, key: string): string => {
  return encryptedMessage.replace('encrypted:', '');
};

// Mock generate a key pair
export const generateKeyPair = async (): Promise<any> => {
  return {
    publicKey: 'mock-public-key',
    privateKey: 'mock-private-key'
  };
};

// Mock export public key
export const exportPublicKey = async (publicKey: any): Promise<string> => {
  return 'mock-exported-public-key';
};

// Mock import public key
export const importPublicKey = async (publicKeyString: string): Promise<any> => {
  return 'mock-imported-public-key';
}; 