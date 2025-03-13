import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
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
  WifiOff as WifiOffIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const ContactList: React.FC = () => {
  const { contacts, setActiveContact, addContact, lookupUser, onlineUsers, getConnectionType, deleteContact } = useChat();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<{ id: string; username: string; publicKey: string } | null>(null);
  const [swipedContactId, setSwipedContactId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

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

  // Handle swipe actions for contacts
  const swipeHandlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      const target = eventData.event.target as HTMLElement;
      const contactElement = target.closest('[data-contact-id]') as HTMLElement;
      if (contactElement) {
        const contactId = contactElement.dataset.contactId;
        if (contactId) {
          setSwipedContactId(swipedContactId === contactId ? null : contactId);
        }
      }
    },
    onSwipedRight: () => {
      setSwipedContactId(null);
    },
    trackMouse: true
  });

  // Toggle preferred connection method for a contact
  const toggleConnectionPreference = (contactId: string, currentType?: 'direct' | 'server' | 'unknown') => {
    // Find the contact
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    // Toggle the connection type
    const newType = currentType === 'direct' ? 'server' : 'direct';
    
    // Update the contact
    addContact(
      contact.username, 
      contact.publicKey, 
      contact.id, 
      contact.onionAddress
    );
    
    // Close the swipe actions
    setSwipedContactId(null);
  };

  // Delete a contact
  const handleDeleteContact = (contactId: string) => {
    setContactToDelete(contactId);
    setDeleteConfirmOpen(true);
  };

  // Confirm contact deletion
  const confirmDeleteContact = () => {
    if (contactToDelete) {
      // Delete the contact using the ChatContext function
      deleteContact(contactToDelete);
      
      // Close the dialog and reset state
      setDeleteConfirmOpen(false);
      setContactToDelete(null);
      setSwipedContactId(null);
    }
  };

  // Cancel contact deletion
  const cancelDeleteContact = () => {
    setDeleteConfirmOpen(false);
    setContactToDelete(null);
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
          filteredContacts.map((contact) => {
            const connectionType = getConnectionType(contact.id);
            const isSwipedOpen = swipedContactId === contact.id;
            
            return (
              <React.Fragment key={contact.id}>
                <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                  {/* Swipe actions */}
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '200px',
                      display: 'flex',
                      transform: isSwipedOpen ? 'translateX(0)' : 'translateX(100%)',
                      transition: 'transform 0.3s ease',
                      zIndex: 1
                    }}
                  >
                    <Box 
                      sx={{ 
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleConnectionPreference(contact.id, connectionType)}
                    >
                      <Box sx={{ textAlign: 'center' }}>
                        {connectionType === 'direct' ? <WifiOffIcon /> : <WifiIcon />}
                        <Typography variant="caption" display="block">
                          {connectionType === 'direct' ? 'Use Server' : 'Use Direct'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box 
                      sx={{ 
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'error.main',
                        color: 'error.contrastText',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleDeleteContact(contact.id)}
                    >
                      <Box sx={{ textAlign: 'center' }}>
                        <DeleteIcon />
                        <Typography variant="caption" display="block">
                          Delete
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  {/* Contact item */}
                  <Box 
                    {...swipeHandlers}
                    data-contact-id={contact.id}
                    sx={{ 
                      transform: isSwipedOpen ? 'translateX(-200px)' : 'translateX(0)',
                      transition: 'transform 0.3s ease',
                      bgcolor: 'background.paper',
                      position: 'relative',
                      zIndex: 2
                    }}
                  >
                    <ListItem 
                      onClick={() => {
                        if (isSwipedOpen) {
                          setSwipedContactId(null);
                        } else {
                          handleContactClick(contact);
                        }
                      }}
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
                                  label={connectionType === 'direct' ? 'Direct' : 'Server'}
                                  size="small"
                                  variant="outlined"
                                  color={connectionType === 'direct' ? 'success' : 'default'}
                                  sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' } }}
                                />
                              )
                            )}
                            {contact.lastMessageTime && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mt: 0.5 }}
                              >
                                {formatDistanceToNow(contact.lastMessageTime, { addSuffix: true })}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  </Box>
                </Box>
                <Divider component="li" />
              </React.Fragment>
            );
          })
        ) : (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchTerm ? 'No contacts found' : 'No contacts yet'}
            </Typography>
          </Box>
        )}
      </List>

      {/* Add Contact Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Add Contact</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={newContactName}
            onChange={(e) => setNewContactName(e.target.value)}
            disabled={isSearching}
          />
          
          {searchError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {searchError}
            </Alert>
          )}
          
          {foundUser && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle1">User Found</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Avatar sx={{ mr: 2 }}>{foundUser.username.charAt(0).toUpperCase()}</Avatar>
                <Typography>{foundUser.username}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {foundUser ? (
            <Button onClick={handleAddContact} color="primary">
              Add Contact
            </Button>
          ) : (
            <Button 
              onClick={handleSearchUser} 
              color="primary" 
              disabled={isSearching || !newContactName.trim()}
            >
              {isSearching ? <CircularProgress size={24} /> : 'Search'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={cancelDeleteContact}>
        <DialogTitle>Delete Contact</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this contact? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteContact}>Cancel</Button>
          <Button onClick={confirmDeleteContact} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContactList; 