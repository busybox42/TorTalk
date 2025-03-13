import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  IconButton, 
  Paper, 
  Divider,
  Avatar,
  CircularProgress,
  Tooltip,
  Chip
} from '@mui/material';
import { 
  Send as SendIcon, 
  Lock as LockIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
  AccessTime as PendingIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

const MessageArea: React.FC = () => {
  const { messages, activeContact, sendMessage, onlineUsers, getConnectionType } = useChat();
  const { currentUser } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter messages for the active contact using useMemo
  const filteredMessages = useMemo(() => {
    if (!activeContact || !currentUser) return [];
    
    return messages.filter(msg => {
      // For older messages that might not have recipientId
      if (!msg.recipientId) {
        // Fall back to the old logic
        return (msg.senderId === activeContact.id) || 
               (msg.senderId === currentUser.id && activeContact.id);
      }
      
      // Check if message is between current user and active contact
      const isFromActiveContact = msg.senderId === activeContact.id;
      const isToActiveContact = msg.recipientId === activeContact.id;
      const isFromCurrentUser = msg.senderId === currentUser.id;
      const isToCurrentUser = msg.recipientId === currentUser.id;
      
      return (isFromActiveContact && isToCurrentUser) || 
             (isFromCurrentUser && isToActiveContact);
    });
  }, [messages, activeContact, currentUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeContact || !currentUser) {
      return;
    }
    
    try {
      setSending(true);
      await sendMessage(newMessage, activeContact.id);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  // Get connection type for the active contact
  const connectionType = activeContact ? getConnectionType(activeContact.id) : 'unknown';

  // Get connection type icon and label
  const getConnectionInfo = () => {
    switch (connectionType) {
      case 'direct':
        return {
          icon: <WifiIcon fontSize="small" color="success" />,
          label: "Direct Tor",
          tooltip: "Direct Tor connection (.onion)"
        };
      case 'server':
        return {
          icon: <WifiOffIcon fontSize="small" color="action" />,
          label: "Server Relay",
          tooltip: "Server-relayed connection"
        };
      default:
        return {
          icon: <WifiOffIcon fontSize="small" color="disabled" />,
          label: "Unknown",
          tooltip: "Connection type unknown"
        };
    }
  };

  const connectionInfo = getConnectionInfo();

  // Get message status icon
  const getMessageStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending':
        return <PendingIcon fontSize="small" sx={{ fontSize: '0.8rem', ml: 0.5 }} />;
      case 'sent':
      case 'sent_relay':
        return <CheckIcon fontSize="small" sx={{ fontSize: '0.8rem', ml: 0.5 }} />;
      case 'delivered':
        return <DoneAllIcon fontSize="small" sx={{ fontSize: '0.8rem', ml: 0.5 }} />;
      case 'read':
        return <DoneAllIcon fontSize="small" color="primary" sx={{ fontSize: '0.8rem', ml: 0.5 }} />;
      case 'failed':
        return <ErrorIcon fontSize="small" color="error" sx={{ fontSize: '0.8rem', ml: 0.5 }} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chat Header */}
      {activeContact ? (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ mr: 2 }}>{activeContact.username.charAt(0).toUpperCase()}</Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1">{activeContact.username}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LockIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                End-to-end encrypted
              </Typography>
              <Typography 
                variant="caption" 
                color={onlineUsers.has(activeContact.id) ? "success.main" : "text.secondary"}
                sx={{ fontWeight: onlineUsers.has(activeContact.id) ? 'bold' : 'normal', mr: 1 }}
              >
                {onlineUsers.has(activeContact.id) ? "Online" : "Offline"}
              </Typography>
              <Tooltip title={connectionInfo.tooltip}>
                <Chip
                  icon={connectionInfo.icon}
                  label={connectionInfo.label}
                  size="small"
                  variant="outlined"
                  color={connectionType === 'direct' ? 'success' : 'default'}
                  sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' } }}
                />
              </Tooltip>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1">Select a contact to start chatting</Typography>
        </Box>
      )}

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, bgcolor: 'background.default' }}>
        {activeContact ? (
          filteredMessages.length > 0 ? (
            filteredMessages.map((message) => {
              const isCurrentUser = message.senderId === currentUser?.id;
              
              return (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                    mb: 2,
                    width: '100%'
                  }}
                >
                  {!isCurrentUser && (
                    <Avatar sx={{ mr: 1, width: 32, height: 32, alignSelf: 'flex-end' }}>
                      {message.senderName.charAt(0).toUpperCase()}
                    </Avatar>
                  )}
                  
                  <Box sx={{ 
                    maxWidth: '70%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isCurrentUser ? 'flex-end' : 'flex-start'
                  }}>
                    <Paper
                      elevation={1}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: isCurrentUser ? 'primary.light' : 'background.paper',
                        color: isCurrentUser ? 'primary.contrastText' : 'text.primary',
                        wordBreak: 'break-word',
                        width: 'auto',
                        minWidth: '60px'
                      }}
                    >
                      <Typography variant="body1">{message.content}</Typography>
                    </Paper>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      mt: 0.5,
                      px: 0.5
                    }}>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                      >
                        {format(message.timestamp, 'HH:mm')}
                      </Typography>
                      
                      {/* Show if message was sent directly or via server */}
                      {message.id.startsWith('local_') && isCurrentUser && (
                        <Tooltip title={connectionType === 'direct' ? 'Sent via direct Tor connection' : 'Sent via server relay'}>
                          {connectionType === 'direct' ? (
                            <WifiIcon fontSize="small" color="success" sx={{ ml: 0.5, width: 16, height: 16 }} />
                          ) : (
                            <WifiOffIcon fontSize="small" color="action" sx={{ ml: 0.5, width: 16, height: 16 }} />
                          )}
                        </Tooltip>
                      )}
                      
                      {/* Message status indicator */}
                      {isCurrentUser && (
                        <Tooltip title={message.status || 'Unknown status'}>
                          <Box component="span">
                            {getMessageStatusIcon(message.status)}
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  
                  {isCurrentUser && (
                    <Avatar sx={{ ml: 1, width: 32, height: 32, alignSelf: 'flex-end' }}>
                      {currentUser.username.charAt(0).toUpperCase()}
                    </Avatar>
                  )}
                </Box>
              );
            })
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography color="text.secondary">
                No messages yet. Start the conversation!
              </Typography>
            </Box>
          )
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="text.secondary">
              Select a contact to start chatting
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Message Input */}
      {activeContact && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <form onSubmit={handleSendMessage} data-testid="message-form">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                  fullWidth
                  placeholder="Type a message..."
                  variant="outlined"
                  size="small"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                />
                <IconButton 
                  color="primary" 
                  type="submit" 
                  sx={{ ml: 1 }}
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? <CircularProgress size={24} /> : <SendIcon />}
                </IconButton>
              </Box>
            </form>
          </Box>
        </>
      )}
    </Box>
  );
};

export default MessageArea; 