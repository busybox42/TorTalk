import React, { useMemo } from 'react';

// Filter messages for the active contact using useMemo
const filteredMessages = useMemo(() => {
  if (!activeContact || !currentUser) return [];
  
  return messages.filter(
    msg => 
      (msg.senderId === activeContact.id && msg.recipientId === currentUser.id) || 
      (msg.senderId === currentUser.id && msg.recipientId === activeContact.id)
  );
}, [messages, activeContact, currentUser]); 