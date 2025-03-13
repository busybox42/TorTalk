import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  Switch, 
  FormControlLabel,
  IconButton,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { 
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  DeleteForever as DeleteIcon,
  Delete as DeleteOutlineIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';

const Settings: React.FC = () => {
  const { currentUser } = useAuth();
  const { isConnected, userSettings, updateUserSettings } = useChat();
  
  const [showPublicKey, setShowPublicKey] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState<boolean>(false);
  const [clearContactsDialogOpen, setClearContactsDialogOpen] = useState<boolean>(false);
  
  const handleCopyPublicKey = () => {
    if (currentUser?.publicKey) {
      navigator.clipboard.writeText(currentUser.publicKey);
      showSnackbar('Public key copied to clipboard!', 'success');
    }
  };
  
  const toggleShowPublicKey = () => {
    setShowPublicKey(!showPublicKey);
  };
  
  const handleAutoConnectChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateUserSettings({ autoConnectToTor: event.target.checked });
  };
  
  const handleNotificationsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateUserSettings({ notificationsEnabled: event.target.checked });
  };
  
  const formatPublicKey = (key: string): string => {
    if (!showPublicKey) {
      return '••••••••••••••••••••••••••••••••';
    }
    
    // Format the key with spaces for better readability
    return key.match(/.{1,4}/g)?.join(' ') || key;
  };
  
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };
  
  const clearAllStorage = () => {
    localStorage.clear();
    showSnackbar('All storage cleared. You will be logged out.', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };
  
  const clearContacts = () => {
    localStorage.removeItem('tortalk_contacts');
    showSnackbar('Contacts cleared. The page will refresh.', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };
  
  return (
    <Box sx={{ height: '100%', p: 3, overflow: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Settings
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      {/* User Information */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Information
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Username
          </Typography>
          <Typography variant="body1">
            {currentUser?.username || 'Not logged in'}
          </Typography>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Your Public Key
          </Typography>
          
          <Card variant="outlined" sx={{ mb: 1, bgcolor: 'background.paper' }}>
            <CardContent sx={{ py: 1, position: 'relative' }}>
              <Typography 
                variant="body2" 
                component="div" 
                sx={{ 
                  fontFamily: 'monospace', 
                  wordBreak: 'break-all',
                  pr: 5
                }}
              >
                {currentUser?.publicKey ? formatPublicKey(currentUser.publicKey) : 'No public key available'}
              </Typography>
              
              <Box sx={{ position: 'absolute', right: 8, top: 8 }}>
                <IconButton 
                  size="small" 
                  onClick={toggleShowPublicKey}
                  sx={{ mr: 1 }}
                >
                  {showPublicKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                </IconButton>
                
                <IconButton 
                  size="small" 
                  onClick={handleCopyPublicKey}
                  disabled={!currentUser?.publicKey}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
          
          <Typography variant="caption" color="text.secondary">
            Share your public key with contacts so they can add you to their contact list.
          </Typography>
        </Box>
      </Paper>
      
      {/* Connection Settings */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Connection Settings
        </Typography>
        
        <FormControlLabel
          control={
            <Switch 
              checked={userSettings.autoConnectToTor} 
              onChange={handleAutoConnectChange} 
            />
          }
          label="Auto-connect to Tor on startup"
        />
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Current Status: {isConnected ? 'Connected to Tor' : 'Disconnected from Tor'}
          </Typography>
        </Box>
      </Paper>
      
      {/* Notification Settings */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Notification Settings
        </Typography>
        
        <FormControlLabel
          control={
            <Switch 
              checked={userSettings.notificationsEnabled} 
              onChange={handleNotificationsChange} 
            />
          }
          label="Enable message notifications"
        />
      </Paper>
      
      {/* Data Management */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Data Management
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<DeleteOutlineIcon />}
            onClick={() => setClearContactsDialogOpen(true)}
          >
            Clear Contacts
          </Button>
          
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<DeleteIcon />}
            onClick={() => setClearAllDialogOpen(true)}
          >
            Clear All Storage
          </Button>
          
          <Typography variant="caption" color="text.secondary">
            Warning: Clearing all storage will log you out and remove all your data from this device.
          </Typography>
        </Box>
      </Paper>
      
      {/* Confirmation Dialogs */}
      <Dialog
        open={clearContactsDialogOpen}
        onClose={() => setClearContactsDialogOpen(false)}
      >
        <DialogTitle>Clear Contacts?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will remove all your contacts. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearContactsDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            setClearContactsDialogOpen(false);
            clearContacts();
          }} color="error">
            Clear Contacts
          </Button>
        </DialogActions>
      </Dialog>
      
      <Dialog
        open={clearAllDialogOpen}
        onClose={() => setClearAllDialogOpen(false)}
      >
        <DialogTitle>Clear All Storage?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will remove all your data including login information, contacts, and messages. You will be logged out. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearAllDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            setClearAllDialogOpen(false);
            clearAllStorage();
          }} color="error">
            Clear All Data
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings; 