# TorTalk Server

This is the WebSocket server for TorTalk, a decentralized chat application.

## Setup

1. Install dependencies:

```bash
npm install express http socket.io cors uuid
```

2. Start the server:

```bash
node server_fixed.js
```

The server will run on port 3001 by default.

## Testing

### Automated Tests

There are several options for automated testing:

#### Basic Automated Test

Run the basic automated test that verifies user discovery and messaging:

```bash
npm test
```

This will create multiple test clients and verify that they can discover each other and exchange messages.

#### Fully Automated Client Test

Run a single fully automated client test that doesn't require any user interaction:

```bash
# Run with default settings
npm run test:client:auto

# Run with custom port and target username
node test_client_automated.js 3000 test_user_3001 "Custom message"
```

#### Full Automated Test Suite

Run a complete test suite that creates multiple clients and tests their interactions:

```bash
npm run test:full
```

This will:
1. Create multiple test clients
2. Each client will look for another client by username
3. Each client will send messages to its target
4. Verify that all operations succeed
5. Report comprehensive test results

### Interactive Test Client

You can also use the interactive test client for manual testing:

```bash
# Run the first client (simulating port 3000)
npm run test:client 3000

# In another terminal, run a second client (simulating port 3003)
npm run test:client 3003
```

The interactive client provides a menu to:
- Find users by username
- List your contacts
- Send messages to contacts
- Exit the client

## Troubleshooting

If you encounter issues with user discovery:

1. Make sure the server is running
2. Check that clients are using unique user IDs
3. Verify that the CORS settings in the server allow connections from your client origins
4. Clear localStorage in your browser if using web clients
5. Check the server logs for any errors or debugging information

## Server API

### Socket.IO Events

#### Client to Server:

- `authenticate`: Authenticate a user
  ```javascript
  {
    userId: string,
    username: string,
    publicKey: string
  }
  ```

- `lookup_user`: Look up a user by username
  ```javascript
  {
    username: string
  }
  ```

- `private_message`: Send a private message
  ```javascript
  {
    senderId: string,
    senderName: string,
    recipientId: string,
    content: string,
    timestamp: string,
    isEncrypted: boolean
  }
  ```

#### Server to Client:

- `authenticated`: Authentication response
  ```javascript
  {
    success: boolean,
    error?: string
  }
  ```

- `user_found`: User lookup response
  ```javascript
  {
    userId: string,
    username: string,
    publicKey: string
  }
  ```

- `user_not_found`: User not found response

- `private_message`: Incoming private message
  ```javascript
  {
    id: string,
    senderId: string,
    senderName: string,
    recipientId: string,
    content: string,
    timestamp: string,
    isEncrypted: boolean
  }
  ```

- `message_delivered`: Message delivery status
  ```javascript
  {
    messageId: string,
    recipientId: string,
    status: 'delivered' | 'pending'
  }
  ```

- `user_status`: User status update
  ```javascript
  {
    userId: string,
    username: string,
    status: 'online' | 'offline'
  }
  ``` 