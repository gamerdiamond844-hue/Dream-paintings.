import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setOnlineUsers(new Set());
      setUnreadCount(0);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(
      import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace('/api', '')
        : window.location.origin,
      {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
      }
    );
    socketRef.current = socket;

    socket.on('connect', () => console.log('[Socket] connected:', socket.id));
    socket.on('disconnect', (reason) => console.log('[Socket] disconnected:', reason));
    socket.on('connect_error', (err) => console.warn('[Socket] connect error:', err.message));
    socket.on('online_users', (ids) => setOnlineUsers(new Set(ids.map(Number))));

    socket.on('user_online', ({ userId, online }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        online ? next.add(Number(userId)) : next.delete(Number(userId));
        return next;
      });
    });

    socket.on('message_notification', () => setUnreadCount(c => c + 1));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]); // only re-run when user id changes

  const isOnline = useCallback(
    (userId) => onlineUsers.has(Number(userId)),
    [onlineUsers]
  );

  const resetUnread = useCallback(() => setUnreadCount(0), []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef,   // expose ref so consumers always get current socket
      isOnline,
      unreadCount,
      setUnreadCount,
      resetUnread,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
