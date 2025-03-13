import React from 'react';
import { Chip, CircularProgress, Tooltip } from '@mui/material';
import { 
  SignalWifi4Bar as ConnectedIcon,
  SignalWifiOff as DisconnectedIcon
} from '@mui/icons-material';
import { useChat } from '../../contexts/ChatContext';

const TorStatus: React.FC = () => {
  const { isConnected, isConnectingToTor, connectToTor, disconnectFromTor } = useChat();

  const handleToggleConnection = async () => {
    if (isConnected) {
      await disconnectFromTor();
    } else if (!isConnectingToTor) {
      await connectToTor();
    }
  };

  return (
    <Tooltip 
      title={
        isConnected 
          ? "Connected to Tor network (click to disconnect)" 
          : isConnectingToTor 
            ? "Connecting to Tor network..." 
            : "Not connected to Tor network (click to connect)"
      }
    >
      <Chip
        icon={
          isConnectingToTor 
            ? <CircularProgress size={16} color="inherit" /> 
            : isConnected 
              ? <ConnectedIcon fontSize="small" /> 
              : <DisconnectedIcon fontSize="small" />
        }
        label={isConnectingToTor ? "Connecting..." : isConnected ? "Tor Connected" : "Tor Disconnected"}
        color={isConnected ? "success" : "default"}
        variant="outlined"
        size="small"
        onClick={!isConnectingToTor ? handleToggleConnection : undefined}
        sx={{ cursor: isConnectingToTor ? 'default' : 'pointer' }}
      />
    </Tooltip>
  );
};

export default TorStatus; 