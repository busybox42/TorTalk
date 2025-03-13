# TorTalk - Secure Messaging App

TorTalk is a secure messaging application that uses the Tor network for anonymous communication and end-to-end encryption for message security.

## Features

- **Secure Authentication**: Simple login and registration system
- **Tor Network Integration**: Routes traffic through the Tor network for anonymity
- **End-to-End Encryption**: Messages are encrypted using AES encryption
- **Contact Management**: Add and manage contacts
- **Modern UI**: Clean and intuitive user interface

## Technical Stack

- **Frontend**: React with TypeScript
- **UI Framework**: Material-UI (MUI)
- **Routing**: React Router
- **Encryption**: Web Cryptography API and CryptoJS
- **Tor Integration**: tor-request and tor-control-promise libraries

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Tor Browser or Tor service running locally (for full functionality)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/tortalk.git
   cd tortalk
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Important Notes

- This is a demonstration application and should not be used for truly sensitive communications without further security auditing.
- For full Tor functionality, you need to have Tor running locally on your machine.
- In a production environment, you would need a backend service to handle Tor connections properly.

## How It Works

1. **Authentication**: Users register and log in with a username and password.
2. **Tor Connection**: The app connects to the Tor network for anonymous communication.
3. **Encryption**: Messages are encrypted using AES encryption before being sent.
4. **Secure Messaging**: Users can send and receive encrypted messages through the Tor network.

## Security Considerations

- The current implementation uses a simplified approach to encryption and Tor integration.
- In a real-world scenario, you would need:
  - A proper backend service for handling Tor connections
  - More robust key management
  - Additional security measures like perfect forward secrecy
  - Regular security audits

## License

This project is licensed under the MIT License - see the LICENSE file for details. 