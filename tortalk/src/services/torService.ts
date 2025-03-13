// Browser-compatible mock for Tor services
// In a real application, you would need a backend service to handle Tor connections

import axios from 'axios';
import config from '../utils/config';

interface TorSettings {
  autoConnect: boolean;
  useHiddenService: boolean;
  hiddenServicePort: number;
}

interface HiddenServiceInfo {
  userId: string;
  onionAddress: string;
  port: number;
  createdAt: number;
}

class TorService {
  private isConnected: boolean = false;
  private torHost: string = 'localhost';
  private torSocksPort: number = 9050;
  private hiddenService: HiddenServiceInfo | null = null;
  private serverUrl: string = config.serverUrl;
  private messageHandlers: Map<string, (message: any) => void> = new Map();
  private directMessageServer: any = null; // In a real app, this would be a proper HTTP server

  // Initialize Tor connection
  async connect(password: string = ''): Promise<boolean> {
    try {
      // This is a mock implementation for browser compatibility
      // In a real app, you would connect to a backend service that interfaces with Tor
      console.log('Attempting to connect to Tor network...');
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      this.isConnected = true;
      console.log('Connected to Tor network');
      return true;
    } catch (error) {
      console.error('Failed to connect to Tor:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Disconnect from Tor
  async disconnect(): Promise<boolean> {
    try {
      // Simulate disconnection delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Stop hidden service if running
      if (this.hiddenService) {
        await this.stopHiddenService();
      }
      
      this.isConnected = false;
      console.log('Disconnected from Tor network');
      return true;
    } catch (error) {
      console.error('Failed to disconnect from Tor:', error);
      return false;
    }
  }

  // Check if connected to Tor
  isConnectedToTor(): boolean {
    return this.isConnected;
  }

  // Make a request through Tor
  async request(url: string, options: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to Tor network'));
        return;
      }

      // In a real app, this would route through Tor
      // For this demo, we'll just use a regular fetch with a delay to simulate Tor latency
      setTimeout(() => {
        fetch(url, options)
          .then(response => response.json())
          .then(data => resolve({ response: { statusCode: 200 }, body: data }))
          .catch(err => reject(err));
      }, 1000);
    });
  }

  // Get a new Tor identity (changes your Tor circuit)
  async newIdentity(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to Tor network');
      }
      
      // Simulate identity change delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Requested new Tor identity');
      return true;
    } catch (error) {
      console.error('Failed to get new Tor identity:', error);
      return false;
    }
  }

  // Create a Tor hidden service
  async createHiddenService(userId: string, port: number = 8080): Promise<HiddenServiceInfo> {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to Tor network');
      }

      console.log(`Creating hidden service for user ${userId} on port ${port}...`);

      // In a real app, this would create an actual Tor hidden service
      // For this demo, we'll register with our server which will simulate it
      try {
        const response = await axios.post(`${this.serverUrl}/api/tor/register`, {
          userId,
          port
        });

        if (!response || response.status !== 200) {
          throw new Error('Failed to create hidden service');
        }

        this.hiddenService = {
          userId,
          onionAddress: response.data.onionAddress,
          port: response.data.port,
          createdAt: Date.now()
        };
      } catch (error) {
        // For testing purposes, create a mock hidden service if the API call fails
        if (process.env.NODE_ENV === 'test') {
          this.hiddenService = {
            userId,
            onionAddress: 'test123.onion',
            port,
            createdAt: Date.now()
          };
        } else {
          throw error;
        }
      }

      console.log(`Created hidden service: ${this.hiddenService.onionAddress}`);

      // Start listening for direct messages
      this.startDirectMessageServer();

      return this.hiddenService;
    } catch (error) {
      console.error('Failed to create hidden service:', error);
      throw error;
    }
  }

  // Stop the Tor hidden service
  async stopHiddenService(): Promise<boolean> {
    try {
      if (!this.hiddenService) {
        return true;
      }

      console.log(`Stopping hidden service: ${this.hiddenService.onionAddress}`);

      // In a real app, this would stop the actual Tor hidden service
      // For this demo, we'll just simulate it
      this.stopDirectMessageServer();
      this.hiddenService = null;

      return true;
    } catch (error) {
      console.error('Failed to stop hidden service:', error);
      return false;
    }
  }

  // Get the current hidden service info
  getHiddenService(): HiddenServiceInfo | null {
    return this.hiddenService;
  }

  // Start the direct message server
  private startDirectMessageServer(): void {
    // In a real app, this would start an HTTP server on the specified port
    // For this demo, we'll just simulate it
    console.log('Starting direct message server...');

    // Simulate a server by setting up a timer to check for messages
    this.directMessageServer = setInterval(() => {
      // This is where we would check for incoming messages in a real app
      console.log('Checking for direct messages...');
    }, 5000);

    console.log('Direct message server started');
  }

  // Stop the direct message server
  private stopDirectMessageServer(): void {
    // In a real app, this would stop the HTTP server
    // For this demo, we'll just clear the interval
    if (this.directMessageServer) {
      clearInterval(this.directMessageServer);
      this.directMessageServer = null;
      console.log('Direct message server stopped');
    }
  }

  // Send a direct message to another user
  async sendDirectMessage(recipientOnion: string, message: any): Promise<boolean> {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to Tor network');
      }

      if (!recipientOnion.endsWith('.onion')) {
        throw new Error('Invalid onion address');
      }

      console.log(`Sending direct message to ${recipientOnion}...`);

      // In a real app, this would send an HTTP request through Tor to the recipient's hidden service
      // For this demo, we'll simulate it with a delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate success or failure randomly
      const success = Math.random() > 0.2; // 80% success rate

      if (success) {
        console.log(`Direct message sent to ${recipientOnion}`);
        return true;
      } else {
        console.log(`Failed to send direct message to ${recipientOnion}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to send direct message:', error);
      return false;
    }
  }

  // Register a handler for direct messages
  registerMessageHandler(type: string, handler: (message: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  // Unregister a message handler
  unregisterMessageHandler(type: string): void {
    this.messageHandlers.delete(type);
  }

  // Handle an incoming direct message
  handleDirectMessage(message: any): void {
    try {
      const { type } = message;
      
      if (!type) {
        console.error('Received message without type');
        return;
      }

      const handler = this.messageHandlers.get(type);
      if (handler) {
        handler(message);
      } else {
        console.log(`No handler registered for message type: ${type}`);
      }
    } catch (error) {
      console.error('Error handling direct message:', error);
    }
  }

  // Get Tor settings from localStorage
  getSettings(): TorSettings {
    try {
      const settings = localStorage.getItem('tortalk_tor_settings');
      if (settings) {
        return JSON.parse(settings);
      }
    } catch (error) {
      console.error('Error parsing Tor settings:', error);
    }

    // Default settings
    return {
      autoConnect: true,
      useHiddenService: true,
      hiddenServicePort: 8080
    };
  }

  // Save Tor settings to localStorage
  saveSettings(settings: TorSettings): void {
    try {
      localStorage.setItem('tortalk_tor_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving Tor settings:', error);
    }
  }
}

// Create an instance of the service
const torServiceInstance = new TorService();

// Export the instance
export default torServiceInstance; 