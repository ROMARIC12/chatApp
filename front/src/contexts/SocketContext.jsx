import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({}); // { userId: { status: 'online'|'offline', lastSeen: 'ISOString'|null } }
  const typingTimers = useRef({}); // To manage typing status debounce

  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
        query: { userId: user._id }, // Pass userId for authentication on backend
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        console.log('Socket Connected:', newSocket.id);
        newSocket.emit('setup', user);
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket Disconnected');
      });

      // Écoute les mises à jour de statut individuelles (pour les changements en temps réel)
      newSocket.on('user status update', ({ userId, status, lastSeen }) => {
        console.log(`User ${userId} is now ${status}`);
        setOnlineUsers(prev => ({
            ...prev,
            [userId]: { status, lastSeen }
        }));
      });

      // NOUVEAU: Écoute la liste complète des utilisateurs en ligne au démarrage
      newSocket.on('online users', (allStatuses) => {
          console.log('Received initial online users list:', allStatuses);
          setOnlineUsers(allStatuses);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
        newSocket.off('connect');
        newSocket.off('disconnect');
        newSocket.off('user status update');
        newSocket.off('online users'); // NOUVEAU: Nettoyer ce listener aussi
      };
    } else if (socket) {
      // Si l'utilisateur se déconnecte, déconnecter le socket
      socket.disconnect();
      setSocket(null);
      setOnlineUsers({}); // Vider les utilisateurs en ligne
    }
  }, [user]); // Dépendance sur 'user' pour reconnecter si l'utilisateur change


  const sendTypingEvent = (chatId, isTyping) => {
    if (!socket) return;

    if (isTyping) {
        socket.emit('typing', chatId);
        if (typingTimers.current[chatId]) {
            clearTimeout(typingTimers.current[chatId]);
        }
        typingTimers.current[chatId] = setTimeout(() => {
            socket.emit('stop typing', chatId);
            delete typingTimers.current[chatId];
        }, 3000);
    } else {
        if (typingTimers.current[chatId]) {
            clearTimeout(typingTimers.current[chatId]);
            delete typingTimers.current[chatId];
        }
        socket.emit('stop typing', chatId);
    }
  };


  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers, sendTypingEvent }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
