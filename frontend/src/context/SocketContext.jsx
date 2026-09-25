import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../config/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to backend WebSocket server (works for both visitors and authenticated players)
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: { token: token || '' },
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      if (user?.id) {
        newSocket.emit('join_user', user.id);
      }
    });

    if (user?.id) {
      newSocket.emit('join_user', user.id);
    }

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?.id]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
