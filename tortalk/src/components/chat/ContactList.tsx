import React, { useState } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Typography, 
  Divider, 
  TextField, 
  InputAdornment, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Badge,
  Tooltip,
  Chip
} from '@mui/material';
import { 
  Search as SearchIcon, 
  PersonAdd as PersonAddIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon
} from '@mui/icons-material';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const ContactList: React.FC = () => {
  const { contacts, setActiveContact, addContact, lookupUser, onlineUsers, getConnectionType } = useChat();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<{ id: string; username: string; publicKey: string } | null>(null);

  // Filter contacts based on search term and exclude current user and mock contacts
  const filteredContacts = contacts.filter(contact => {
    // Exclude mock contacts
    const mockUsernames = ['alice', 'bob', 'user1', 'user2'];
    if (mockUsernames.includes(contact.username.toLowerCase())) {
      return false;
    }
    
    // Exclude current user and filter by search term
    return contact.username.toLowerCase().includes(searchTerm.toLowerCase()) && 
           contact.id !== currentUser?.id;
  });

  const handleContactClick = (contact: any) => {
    setActiveContact(contact);
  };

  const handleSearchUser = async () => {
    if (!newContactName.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    setFoundUser(null);
    
    try {
      console.log(`Searching for user: ${newContactName}`);
      
      // Make sure we're searching for a username, not a public key
      const searchTerm = newContactName.trim();
      
      console.log('About to call lookupUser with:', searchTerm);
      
      const user = await lookupUser(searchTerm);
      
      console.log('lookupUser result:', user);
      
      if (user) {
        console.log(`Found user: ${user.username} with ID: ${user.id}`);
        setFoundUser(user);
        
        // Check if we already have this contact with a different ID
        const existingContact = contacts.find(c => 
          c.username.toLowerCase() === user.username.toLowerCase() && c.id !== user.id
        );
        
        if (existingContact) {
          console.log(`Found existing contact with different ID. Updating ID from ${existingContact.id} to ${user.id}`);
          // Update the contact with the correct ID from the server
          addContact(user.username, user.publicKey, user.id);
        }
      } else {
        console.log(`User not found: ${searchTerm}`);
        setSearchError('User not found');
      }
    } catch (error) {
      console.error('Error searching for user:', error);
      setSearchError('Error searching for user');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddContact = () => {
    if (foundUser) {
      addContact(foundUser.username, foundUser.publicKey, foundUser.id);
      handleCloseDialog();
    }
  };
  
  const handleCloseDialog = () => {
    setOpenAddDialog(false);
    setNewContactName('');
    setFoundUser(null);
    setSearchError(null);
  };

  // Get connection status icon for a contact
  const getConnectionIcon = (contactId: string) => {
    const connectionType = getConnectionType(contactId);
    
    if (connectionType === 'direct') {
      return (
        <Tooltip title="Direct Tor connection">
          <WifiIcon fontSize="small" color="success" sx={{ ml: 1 }} />
        </Tooltip>
      );
    } else if (connectionType === 'server') {
      return (
        <Tooltip title="Server-relayed connection">
          <WifiOffIcon fontSize="small" color="action" sx={{ ml: 1 }} />
        </Tooltip>
      );
    }
    
    return null;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search and Add Contact */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  edge="end" 
                  size="small"
                  onClick={() => setOpenAddDialog(true)}
                  title="Add Contact"
                >
                  <PersonAddIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* Contact List */}
      <List sx={{ flexGrow: 1, overflow: 'auto' }}>
        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => (
            <React.Fragment key={contact.id}>
              <ListItem 
                onClick={() => handleContactClick(contact)}
                sx={{ 
                  '&:hover': { 
                    bgcolor: 'action.hover' 
                  },
                  cursor: 'pointer'
                }}
              >
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    color="success"
                    invisible={!onlineUsers.has(contact.id)}
                  >
                    <Avatar>{contact.username.charAt(0).toUpperCase()}</Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography component="span">{contact.username}</Typography>
                      {contact.onionAddress && getConnectionIcon(contact.id)}
                    </Box>
                  }
                  secondary={
                    <Box>
                      {contact.lastMessage ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                        >
                          {contact.lastMessage}
                        </Typography>
                      ) : (
                        contact.onionAddress && (
                          <Chip
                            label={contact.connectionType === 'direct' ? 'Direct' : 'Server'}
                            size="small"
                            color={contact.connectionType === 'direct' ? 'success' : 'default'}
                            sx={{ height: 20, fontSize: '0.6rem' }}
                          />
                        )
                      )}
                    </Box>
                  }
                />
                {contact.lastMessageTime && (
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNow(contact.lastMessageTime, { addSuffix: true })}
                  </Typography>
                )}
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          ))
        ) : (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchTerm ? 'No contacts found' : 'No contacts yet'}
            </Typography>
          </Box>
        )}
      </List>

      {/* Add Contact Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseDialog}>
        <DialogTitle>Add New Contact</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Username to search"
              fullWidth
              variant="outlined"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              disabled={isSearching}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {isSearching ? (
                      <CircularProgress size={24} />
                    ) : (
                      <IconButton 
                        edge="end" 
                        onClick={handleSearchUser}
                        disabled={!newContactName.trim()}
                      >
                        <SearchIcon />
                      </IconButton>
                    )}
                  </InputAdornment>
                )
              }}
            />
          </Box>
          
          {searchError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {searchError}
            </Alert>
          )}
          
          {foundUser && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                User found!
              </Alert>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ mr: 2 }}>{foundUser.username.charAt(0).toUpperCase()}</Avatar>
                <Typography variant="subtitle1">{foundUser.username}</Typography>
              </Box>
              
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Public Key:
              </Typography>
              
              <Typography 
                variant="body2" 
                sx={{ 
                  bgcolor: 'background.paper', 
                  p: 1, 
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  wordBreak: 'break-all'
                }}
              >
                {foundUser.publicKey}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleAddContact} 
            variant="contained"
            disabled={!foundUser}
          >
            Add Contact
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContactList; 