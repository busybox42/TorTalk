import React, { useEffect } from 'react';
import { Box, Paper, Typography, IconButton } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Settings from './Settings';

const SettingsLayout: React.FC = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleBackToChat = () => {
    navigate('/chat');
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
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={handleBackToChat} 
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div">
            Settings
          </Typography>
        </Box>
        
        <Typography variant="body2">
          Logged in as: {currentUser.username}
        </Typography>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Settings />
      </Box>
      
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

export default SettingsLayout; 