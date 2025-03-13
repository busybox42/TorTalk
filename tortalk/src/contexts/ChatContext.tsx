import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { encryptMessage, decryptMessage } from '../utils/encryption';
import torService from '../services/torService';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId?: string;
  content: string;
  timestamp: number;
  isEncrypted: boolean;
}

interface Contact {
  id: string;
  username: string;
  publicKey: string;
  onionAddress?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  connectionType?: 'direct' | 'server';
}

interface UserSettings {
  autoConnectToTor: boolean;
  notificationsEnabled: boolean;
}

interface ChatContextType {
  messages: Message[];
  contacts: Contact[];
  activeContact: Contact | null;
  isConnected: boolean;
  isConnectingToTor: boolean;
  userSettings: UserSettings;
  connectToTor: () => Promise<boolean>;
  disconnectFromTor: () => Promise<boolean>;
  sendMessage: (content: string, recipientId: string) => Promise<boolean>;
  setActiveContact: (contact: Contact) => void;
  addContact: (username: string, publicKey: string, userId?: string, onionAddress?: string) => void;
  updateUserSettings: (settings: Partial<UserSettings>) => void;
  lookupUser: (username: string) => Promise<Contact | null>;
  onlineUsers: Set<string>;
  createHiddenService: () => Promise<boolean>;
  getConnectionType: (contactId: string) => 'direct' | 'server' | 'unknown';
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnectingToTor, setIsConnectingToTor] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [userSettings, setUserSettings] = useState<UserSettings>({
    autoConnectToTor: true,
    notificationsEnabled: true
  });
  
  // Encryption key for messages - in a real app, this would be managed more securely
  const [encryptionKey] = useState<string>('tortalk-encryption-key');

  // Initialize socket connection
  useEffect(() => {
    if (currentUser) {
      // Connect to WebSocket server
      const newSocket = io('http://localhost:3001');
      setSocket(newSocket);
      
      // Clean up on unmount
      return () => {
        newSocket.disconnect();
      };
    }
  }, [currentUser]);
  
  // Authenticate with WebSocket server when socket and user are available
  useEffect(() => {
    if (socket && currentUser) {
      console.log(`Attempting to authenticate user: ${currentUser.username} (${currentUser.id})`);
      console.log(`User public key: ${currentUser.publicKey ? 'Available' : 'Not available'}`);
      
      // Authenticate user
      socket.emit('authenticate', {
        userId: currentUser.id,
        username: currentUser.username,
        publicKey: currentUser.publicKey
      });
      
      // Listen for authentication response
      socket.on('authenticated', (response) => {
        console.log('Authentication response:', response);
      });
      
      // Listen for user status updates
      socket.on('user_status', ({ userId, status }) => {
        console.log(`User status update: ${userId} is now ${status}`);
        if (status === 'online') {
          setOnlineUsers(prev => new Set([...Array.from(prev), userId]));
        } else {
          setOnlineUsers(prev => {
            const newSet = new Set(Array.from(prev));
            newSet.delete(userId);
            return newSet;
          });
        }
      });
      
      // Listen for private messages
      socket.on('private_message', (message) => {
        console.log('Received private message:', message);
        
        // Decrypt the message if it's encrypted
        if (message.isEncrypted) {
          try {
            const decryptedContent = decryptMessage(message.content, encryptionKey);
            message = { ...message, content: decryptedContent, isEncrypted: false };
          } catch (error) {
            console.error('Failed to decrypt message:', error);
          }
        }
        
        // Add message to state, but check for duplicates first
        setMessages(prevMessages => {
          // Check if this message already exists in our state (by ID)
          const messageExists = prevMessages.some(m => m.id === message.id);
          if (messageExists) {
            return prevMessages; // Don't add duplicate messages
          }
          return [...prevMessages, message];
        });
        
        // Show notification if enabled
        if (userSettings.notificationsEnabled && document.hidden) {
          const sender = contacts.find(c => c.id === message.senderId);
          if (sender) {
            new Notification(`New message from ${sender.username}`, {
              body: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '')
            });
          }
        }
      });
      
      // Listen for message delivery status
      socket.on('message_delivered', ({ messageId, status }) => {
        console.log(`Message ${messageId} status: ${status}`);
        // You could update the UI to show delivery status
      });
    }
  }, [socket, currentUser, contacts, encryptionKey, userSettings.notificationsEnabled]);

  // Load user settings from localStorage
  useEffect(() => {
    if (currentUser) {
      const storedSettings = localStorage.getItem(`tortalk_settings_${currentUser.id}`);
      if (storedSettings) {
        try {
          const parsedSettings = JSON.parse(storedSettings);
          setUserSettings(prevSettings => ({
            ...prevSettings,
            ...parsedSettings
          }));
        } catch (error) {
          console.error('Error parsing stored settings:', error);
        }
      }
    }
  }, [currentUser]);

  // Auto-connect to Tor based on settings
  useEffect(() => {
    if (currentUser && userSettings.autoConnectToTor && !isConnected && !isConnectingToTor) {
      connectToTor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, userSettings.autoConnectToTor, isConnected, isConnectingToTor]);

  // Update user settings
  const updateUserSettings = (settings: Partial<UserSettings>) => {
    setUserSettings(prevSettings => {
      const newSettings = { ...prevSettings, ...settings };
      
      // Save to localStorage
      if (currentUser) {
        localStorage.setItem(`tortalk_settings_${currentUser.id}`, JSON.stringify(newSettings));
      }
      
      return newSettings;
    });
  };

  // Connect to Tor network
  const connectToTor = async (): Promise<boolean> => {
    try {
      setIsConnectingToTor(true);
      const connected = await torService.connect();
      setIsConnected(connected);
      setIsConnectingToTor(false);
      return connected;
    } catch (error) {
      console.error('Failed to connect to Tor:', error);
      setIsConnectingToTor(false);
      return false;
    }
  };

  // Disconnect from Tor network
  const disconnectFromTor = async (): Promise<boolean> => {
    try {
      const disconnected = await torService.disconnect();
      setIsConnected(false);
      return disconnected;
    } catch (error) {
      console.error('Failed to disconnect from Tor:', error);
      return false;
    }
  };

  // Send a message
  const sendMessage = async (content: string, recipientId: string): Promise<boolean> => {
    if (!currentUser || !content || !recipientId || !socket) {
      console.error('Cannot send message: missing required data', { 
        hasCurrentUser: !!currentUser, 
        hasContent: !!content, 
        recipientId, 
        hasSocket: !!socket 
      });
      return false;
    }

    try {
      console.log('Sending message to recipient ID:', recipientId);
      
      // Generate a unique message ID for local tracking
      const localMessageId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Encrypt the message
      const encryptedContent = encryptMessage(content, encryptionKey);
      
      // Create a message object
      const messageData = {
        id: localMessageId,
        senderId: currentUser.id,
        senderName: currentUser.username,
        recipientId,
        content: encryptedContent,
        timestamp: Date.now(),
        isEncrypted: true,
        type: 'chat_message'
      };

      // Find the recipient contact
      const recipient = contacts.find(c => c.id === recipientId);
      
      // Try direct messaging if both users have Tor hidden services
      let sentDirectly = false;
      
      if (recipient?.onionAddress && isConnected && torService.getHiddenService()) {
        try {
          console.log(`Attempting direct message to ${recipient.username} at ${recipient.onionAddress}`);
          
          sentDirectly = await torService.sendDirectMessage(recipient.onionAddress, messageData);
          
          if (sentDirectly) {
            console.log(`Message sent directly to ${recipient.username}`);
            
            // Update contact connection type
            if (recipient.connectionType !== 'direct') {
              setContacts(prevContacts => 
                prevContacts.map(c => 
                  c.id === recipientId 
                    ? { ...c, connectionType: 'direct' } 
                    : c
                )
              );
            }
          }
        } catch (error) {
          console.error('Failed to send direct message:', error);
        }
      }
      
      // Fall back to server relay if direct messaging failed or wasn't possible
      if (!sentDirectly) {
        console.log('Using server relay for message delivery');
        
        // Update contact connection type
        if (recipient && recipient.connectionType !== 'server') {
          setContacts(prevContacts => 
            prevContacts.map(c => 
              c.id === recipientId 
                ? { ...c, connectionType: 'server' } 
                : c
            )
          );
        }
        
        // Send message through WebSocket
        socket.emit('private_message', messageData);
      }
      
      // Add message to local state (unencrypted for display)
      const localMessage: Message = {
        id: localMessageId,
        senderId: currentUser.id,
        senderName: currentUser.username,
        recipientId,
        content, // Unencrypted for local display
        timestamp: messageData.timestamp,
        isEncrypted: false
      };
      
      setMessages(prevMessages => [...prevMessages, localMessage]);
      
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  };

  // Add a new contact
  const addContact = (username: string, publicKey: string, userId?: string, onionAddress?: string) => {
    // Use the provided userId or generate a deterministic one based on username
    const contactId = userId || `user_${username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    
    console.log(`Adding/updating contact: ${username} with ID: ${contactId}`);
    
    const newContact: Contact = {
      id: contactId,
      username,
      publicKey,
      onionAddress
    };
    
    setContacts(prevContacts => {
      // Check if contact already exists by username or ID
      const existingContactIndex = prevContacts.findIndex(c => 
        c.username.toLowerCase() === username.toLowerCase() || c.id === contactId
      );
      
      if (existingContactIndex >= 0) {
        console.log(`Updating existing contact at index ${existingContactIndex}`);
        // Update the existing contact
        const updatedContacts = [...prevContacts];
        // Preserve lastMessage and lastMessageTime if they exist
        if (updatedContacts[existingContactIndex].lastMessage) {
          newContact.lastMessage = updatedContacts[existingContactIndex].lastMessage;
        }
        if (updatedContacts[existingContactIndex].lastMessageTime) {
          newContact.lastMessageTime = updatedContacts[existingContactIndex].lastMessageTime;
        }
        updatedContacts[existingContactIndex] = newContact;
        return updatedContacts;
      }
      
      // Add as a new contact
      return [...prevContacts, newContact];
    });
  };

  // Look up a user by username
  const lookupUser = useCallback(async (username: string): Promise<Contact | null> => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        console.error('Cannot lookup user: not connected to server');
        reject(new Error('Not connected to server'));
        return;
      }
      
      console.log(`Looking up user with username: ${username}`);
      console.log('Socket connected:', !!socket);
      console.log('Socket ID:', socket.id);
      
      // Send lookup request
      socket.emit('lookup_user', { username });
      console.log('Emitted lookup_user event');
      
      // Listen for response
      const onUserFound = (user: { userId: string; username: string; publicKey: string }) => {
        console.log(`User found on server: ${user.username} (${user.userId})`);
        const contact: Contact = {
          id: user.userId,
          username: user.username,
          publicKey: user.publicKey
        };
        resolve(contact);
        
        // Remove listeners
        socket.off('user_found', onUserFound);
        socket.off('user_not_found', onUserNotFound);
      };
      
      const onUserNotFound = () => {
        console.log(`User not found on server: ${username}`);
        resolve(null);
        
        // Remove listeners
        socket.off('user_found', onUserFound);
        socket.off('user_not_found', onUserNotFound);
      };
      
      // Set up listeners
      socket.on('user_found', onUserFound);
      socket.on('user_not_found', onUserNotFound);
      console.log('Set up socket listeners for user_found and user_not_found');
      
      // Set timeout
      setTimeout(() => {
        console.log(`Lookup timed out for username: ${username}`);
        socket.off('user_found', onUserFound);
        socket.off('user_not_found', onUserNotFound);
        reject(new Error('Lookup timed out'));
      }, 5000);
    });
  }, [socket]);

  // Load contacts from localStorage
  useEffect(() => {
    const storedContacts = localStorage.getItem('tortalk_contacts');
    if (storedContacts) {
      try {
        const parsedContacts = JSON.parse(storedContacts);
        
        // Filter out mock contacts and update remaining contacts to use deterministic IDs
        const updatedContacts = parsedContacts
          .filter((contact: Contact) => {
            // Filter out known mock contacts
            const mockUsernames = ['alice', 'bob', 'user1', 'user2'];
            return !mockUsernames.includes(contact.username.toLowerCase());
          })
          .map((contact: Contact) => {
            // If the ID doesn't start with "user_", update it to a deterministic ID
            if (!contact.id.startsWith('user_')) {
              const newId = `user_${contact.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
              console.log(`Updating contact ID from ${contact.id} to ${newId}`);
              return { ...contact, id: newId };
            }
            return contact;
          });
        
        setContacts(updatedContacts);
      } catch (error) {
        console.error('Error parsing stored contacts:', error);
      }
    } else {
      // Start with an empty contacts list for new users
      setContacts([]);
    }
  }, []);

  // Save contacts to localStorage when they change
  useEffect(() => {
    if (contacts.length > 0) {
      localStorage.setItem('tortalk_contacts', JSON.stringify(contacts));
    }
  }, [contacts]);

  // Handle direct messages from Tor
  const handleDirectMessage = (message: any) => {
    try {
      console.log('Received direct message:', message);
      
      if (message.type !== 'chat_message') {
        console.log(`Ignoring non-chat message of type: ${message.type}`);
        return;
      }
      
      if (!message.id || !message.senderId || !message.content) {
        console.error('Invalid message format:', message);
        return;
      }
      
      // Check if we already have this message (prevent duplicates)
      const isDuplicate = messages.some(m => m.id === message.id);
      if (isDuplicate) {
        console.log(`Ignoring duplicate message with ID: ${message.id}`);
        return;
      }
      
      // Decrypt the message if it's encrypted
      let content = message.content;
      if (message.isEncrypted) {
        try {
          content = decryptMessage(message.content, encryptionKey);
        } catch (error) {
          console.error('Failed to decrypt message:', error);
          content = '[Encrypted Message]';
        }
      }
      
      // Create a message object for our state
      const newMessage: Message = {
        id: message.id,
        senderId: message.senderId,
        senderName: message.senderName || 'Unknown',
        recipientId: currentUser?.id || '',
        content,
        timestamp: message.timestamp || Date.now(),
        isEncrypted: false
      };
      
      // Add to messages state
      setMessages(prevMessages => [...prevMessages, newMessage]);
      
      // Show notification if enabled
      if (userSettings.notificationsEnabled && document.visibilityState === 'hidden') {
        const sender = contacts.find(c => c.id === message.senderId);
        const senderName = sender?.username || message.senderName || 'Unknown';
        
        new Notification(`New message from ${senderName}`, {
          body: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          icon: '/logo192.png'
        });
      }
      
      // Update contact connection type to direct
      const senderId = message.senderId;
      if (senderId) {
        setContacts(prevContacts => 
          prevContacts.map(c => 
            c.id === senderId && c.connectionType !== 'direct'
              ? { ...c, connectionType: 'direct' }
              : c
          )
        );
      }
    } catch (error) {
      console.error('Error handling direct message:', error);
    }
  };

  // Register for direct messages when connected to Tor
  useEffect(() => {
    if (isConnected && currentUser) {
      // Register for direct messages
      torService.registerMessageHandler('chat_message', handleDirectMessage);
      
      // Clean up on unmount
      return () => {
        torService.unregisterMessageHandler('chat_message');
      };
    }
  }, [isConnected, currentUser, messages, contacts]);

  // Create hidden service when connected to Tor
  useEffect(() => {
    const initTorHiddenService = async () => {
      if (isConnected && currentUser && !torService.getHiddenService()) {
        try {
          const settings = torService.getSettings();
          if (settings.useHiddenService) {
            const hiddenService = await createHiddenService();
            console.log('Hidden service created:', hiddenService);
          }
        } catch (error) {
          console.error('Failed to create hidden service:', error);
        }
      }
    };
    
    initTorHiddenService();
  }, [isConnected, currentUser]);

  // Create a Tor hidden service for direct messaging
  const createHiddenService = async (): Promise<boolean> => {
    try {
      if (!currentUser) {
        console.error('Cannot create hidden service: no current user');
        return false;
      }

      if (!isConnected) {
        console.error('Cannot create hidden service: not connected to Tor');
        return false;
      }

      console.log('Creating Tor hidden service...');
      
      // Get Tor settings
      const torSettings = torService.getSettings();
      
      // Create hidden service
      const service = await torService.createHiddenService(
        currentUser.id,
        torSettings.hiddenServicePort
      );
      
      console.log(`Hidden service created: ${service.onionAddress}`);
      
      // Register message handler for chat messages
      torService.registerMessageHandler('chat_message', handleDirectMessage);
      
      return true;
    } catch (error) {
      console.error('Failed to create hidden service:', error);
      return false;
    }
  };

  // Get the connection type for a contact
  const getConnectionType = (contactId: string): 'direct' | 'server' | 'unknown' => {
    const contact = contacts.find(c => c.id === contactId);
    
    if (!contact) {
      return 'unknown';
    }
    
    if (contact.connectionType) {
      return contact.connectionType;
    }
    
    // If no connection type is set yet, determine based on onion address
    if (contact.onionAddress && isConnected && torService.getHiddenService()) {
      return 'direct';
    }
    
    return 'server';
  };

  const value = {
    messages,
    contacts,
    activeContact,
    isConnected,
    isConnectingToTor,
    userSettings,
    connectToTor,
    disconnectFromTor,
    sendMessage,
    setActiveContact,
    addContact,
    updateUserSettings,
    lookupUser,
    onlineUsers,
    createHiddenService,
    getConnectionType
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}; 