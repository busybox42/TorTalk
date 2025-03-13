import '@testing-library/jest-dom';
import torService from '../services/torService';

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn().mockImplementation(() => Promise.resolve({ 
    status: 200, 
    data: { 
      onionAddress: 'test123.onion', 
      port: 8080 
    } 
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

describe('TorService Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  test('should connect to Tor', async () => {
    const result = await torService.connect();
    expect(result).toBe(true);
    expect(torService.isConnectedToTor()).toBe(true);
  });

  test('should disconnect from Tor', async () => {
    // First connect
    await torService.connect();
    expect(torService.isConnectedToTor()).toBe(true);
    
    // Then disconnect
    const result = await torService.disconnect();
    expect(result).toBe(true);
    expect(torService.isConnectedToTor()).toBe(false);
  });

  test('should get and save settings', () => {
    // Default settings
    const defaultSettings = torService.getSettings();
    expect(defaultSettings).toEqual({
      autoConnect: true,
      useHiddenService: true,
      hiddenServicePort: 8080
    });
    
    // Save new settings
    const newSettings = {
      autoConnect: false,
      useHiddenService: true,
      hiddenServicePort: 9090
    };
    
    torService.saveSettings(newSettings);
    
    // Get settings again
    const savedSettings = torService.getSettings();
    expect(savedSettings).toEqual(newSettings);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'tortalk_tor_settings', 
      JSON.stringify(newSettings)
    );
  });
}); 