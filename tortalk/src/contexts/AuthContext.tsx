import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { generateKey } from '../utils/encryption';

interface User {
  id: string;
  username: string;
  publicKey: string;
}

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Clear localStorage on app start to force new registration
  useEffect(() => {
    console.log('Clearing localStorage to ensure clean state');
    localStorage.removeItem('tortalk_user');
    localStorage.removeItem('tortalk_contacts');
    
    // For extra safety, check if there's any data left and clear it
    const hasContacts = localStorage.getItem('tortalk_contacts');
    if (hasContacts) {
      console.log('Found existing contacts data, clearing it completely');
      localStorage.clear();
    }
  }, []);

  // Load user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('tortalk_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored user:', error);
      }
    }
    setLoading(false);
  }, []);

  // In a real app, this would connect to a backend service
  // This is a simplified mock implementation
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Mock authentication - in a real app, this would validate with a server
      if (username && password) {
        // Generate a deterministic ID based on the username
        const userId = `user_${username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        
        console.log(`Logging in user with ID: ${userId} and username: ${username}`);
        
        // Generate a mock public key
        const publicKey = generateKey();
        
        const user: User = {
          id: userId,
          username,
          publicKey
        };
        
        setCurrentUser(user);
        setIsAuthenticated(true);
        
        // Store user in localStorage for persistence
        localStorage.setItem('tortalk_user', JSON.stringify(user));
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (username: string, password: string): Promise<boolean> => {
    try {
      // Mock registration - in a real app, this would register with a server
      if (username && password && password.length >= 8) {
        // Generate a deterministic ID based on the username
        const userId = `user_${username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        
        console.log(`Registering user with ID: ${userId} and username: ${username}`);
        
        // Generate a mock public key
        const publicKey = generateKey();
        
        const user: User = {
          id: userId,
          username,
          publicKey
        };
        
        setCurrentUser(user);
        setIsAuthenticated(true);
        
        // Store user in localStorage for persistence
        localStorage.setItem('tortalk_user', JSON.stringify(user));
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('tortalk_user');
  };

  const value = {
    currentUser,
    isAuthenticated,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 