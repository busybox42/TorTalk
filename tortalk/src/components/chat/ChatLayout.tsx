import React, { useEffect } from 'react';
import { Box, Grid, Paper, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import ContactList from './ContactList';
import MessageArea from './MessageArea';
import TorStatus from './TorStatus';
import { Settings as SettingsIcon } from '@mui/icons-material';

const ChatLayout: React.FC = () => {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const { connectToTor, isConnected, isConnectingToTor, userSettings } = useChat();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Connect to Tor when component mounts if auto-connect is enabled
  useEffect(() => {
    if (isAuthenticated && !isConnected && !isConnectingToTor && userSettings.autoConnectToTor) {
      connectToTor();
    }
  }, [isAuthenticated, isConnected, isConnectingToTor, connectToTor, userSettings.autoConnectToTor]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderRadius: 0
        }}
      >
        <Typography variant="h6" component="div">
          TorTalk
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TorStatus />
          <Typography variant="body2">
            Logged in as: {currentUser.username}
          </Typography>
          <Button 
            variant="outlined" 
            size="small" 
            startIcon={<SettingsIcon />}
            onClick={() => navigate('/settings')}
            sx={{ mr: 1 }}
          >
            Settings
          </Button>
          <Button variant="outlined" size="small" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Paper>

      {/* Main Content */}
      <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* Contact List */}
        <Grid item xs={3} sx={{ borderRight: 1, borderColor: 'divider' }}>
          <ContactList />
        </Grid>
        
        {/* Message Area */}
        <Grid item xs={9}>
          <MessageArea />
        </Grid>
      </Grid>
      
      {/* Footer */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 1, 
          borderRadius: 0,
          display: 'flex',
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}
      >
        <Typography variant="caption" color="text.secondary">
          TorTalk - Secure Messaging via Tor Network
        </Typography>
      </Paper>
    </Box>
  );
};

export default ChatLayout; 