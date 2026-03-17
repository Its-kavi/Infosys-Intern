// src/context/ChatContext.jsx
/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import chatService from '../services/ChatService';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [activeChatSessions, setActiveChatSessions] = useState(new Map());
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [unreadCounts, setUnreadCounts] = useState(new Map());
  const [sendError, setSendError] = useState(null);
  const isInitialized = useRef(false);
  const sendErrorTimeout = useRef(null);

  /**
   * Handle incoming messages from WebSocket
   */
  const handleIncomingMessage = useCallback((message) => {
    const tripId = String(message.tripId);

    // Ignore messages sent by current user (already added optimistically)
    if (user?.id && String(message.senderId) === String(user.id)) {
      return;
    }

    // Update active chat session if it exists, OR create new session if needed
    setActiveChatSessions((prev) => {
      const updated = new Map(prev);
      if (updated.has(tripId)) {
        const session = updated.get(tripId);
        
        // Check if message already exists (prevent duplicates)
        const messageExists = session.messages.some(
          msg => msg.id === message.id || 
          (msg.timestamp === message.timestamp && msg.content === message.content)
        );
        
        if (!messageExists) {
          updated.set(tripId, {
            ...session,
            messages: [...session.messages, message],
            lastMessage: message,
            lastMessageTime: new Date(message.timestamp),
          });
        }
      } else {
        // No active session - create one with this message
        updated.set(tripId, {
          tripId,
          messages: [message],
          otherUser: {
            id: message.senderId,
            name: message.senderName || 'User'
          },
          lastMessage: message,
          lastMessageTime: new Date(message.timestamp),
          isActive: false,
        });
      }
      return updated;
    });

    // Update unread count
    setUnreadCounts((prev) => {
      const updated = new Map(prev);
      const currentCount = updated.get(tripId) || 0;
      updated.set(tripId, currentCount + 1);
      return updated;
    });
  }, [user]);

  /**
   * Handle connection status changes
   */
  const handleConnectionStatus = useCallback((status) => {
    setConnectionStatus(status);
  }, []);

  /**
   * Handle send errors from WebSocket
   */
  const handleSendError = useCallback((payload) => {
    const message =
      typeof payload === 'string'
        ? payload
        : payload?.message || payload?.error || 'Message could not be sent.';

    setSendError(message);

    if (sendErrorTimeout.current) {
      clearTimeout(sendErrorTimeout.current);
    }

    sendErrorTimeout.current = setTimeout(() => {
      setSendError(null);
    }, 5000);
  }, []);

  const clearSendError = useCallback(() => {
    setSendError(null);
    if (sendErrorTimeout.current) {
      clearTimeout(sendErrorTimeout.current);
      sendErrorTimeout.current = null;
    }
  }, []);

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (user?.token && !isInitialized.current) {
      isInitialized.current = true;

      chatService.connect(
        user.token,
        handleIncomingMessage,
        handleConnectionStatus,
        handleSendError
      );
    }

    return () => {
      if (isInitialized.current) {
        chatService.disconnect();
        isInitialized.current = false;
      }
    };
  }, [user?.token, handleIncomingMessage, handleConnectionStatus, handleSendError]);

  /**
   * Initialize a chat session for a trip
   * @param {string} tripId - The trip/ride ID
   * @param {Array} initialMessages - Initial messages (from history)
   * @param {object} otherUser - The other participant (driver or passenger)
   */
  const initializeChatSession = useCallback(
    (tripId, initialMessages = [], otherUser = null) => {
      // CRITICAL: Normalize tripId to STRING
      const normalizedTripId = String(tripId);
      setActiveChatSessions((prev) => {
        const updated = new Map(prev);
        updated.set(normalizedTripId, {
          tripId: normalizedTripId,
          messages: initialMessages,
          otherUser,
          lastMessage: initialMessages[initialMessages.length - 1] || null,
          lastMessageTime: initialMessages.length
            ? new Date(initialMessages[initialMessages.length - 1].timestamp)
            : null,
          isActive: true,
        });
        return updated;
      });

      // Clear unread count when opening chat
      setUnreadCounts((prev) => {
        const updated = new Map(prev);
        updated.delete(normalizedTripId);
        return updated;
      });
    },
    []
  );

  /**
   * Send a message
   * @param {string} tripId - The trip/ride ID
   * @param {string} recipientId - Recipient's user ID
   * @param {string} content - Message content
   * @returns {Promise}
   */
  const sendMessage = useCallback(
    async (tripId, recipientId, content) => {
      // CRITICAL: Normalize tripId to STRING
      const normalizedTripId = String(tripId);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (!content || !content.trim()) {
        throw new Error('Message content is required');
      }

      // Optimistically add message to UI
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        tripId: normalizedTripId,
        senderId: String(user.id),
        recipientId: String(recipientId),
        content: content.trim(),
        timestamp: new Date().toISOString(),
        status: 'sending',
      };

      setActiveChatSessions((prev) => {
        const updated = new Map(prev);
        if (updated.has(normalizedTripId)) {
          const session = updated.get(normalizedTripId);
          updated.set(normalizedTripId, {
            ...session,
            messages: [...session.messages, optimisticMessage],
            lastMessage: optimisticMessage,
            lastMessageTime: new Date(optimisticMessage.timestamp),
          });
        }
        return updated;
      });

      try {
        // Send via WebSocket
        await chatService.sendMessage(
          normalizedTripId,
          user.id,
          recipientId,
          content.trim()
        );

        // Update status to sent
        setActiveChatSessions((prev) => {
          const updated = new Map(prev);
          if (updated.has(normalizedTripId)) {
            const session = updated.get(normalizedTripId);
            const messages = session.messages.map((msg) =>
              msg.id === optimisticMessage.id
                ? { ...msg, status: 'sent' }
                : msg
            );
            updated.set(normalizedTripId, { ...session, messages });
          }
          return updated;
        });

        return optimisticMessage;
      } catch (error) {
        console.error('Failed to send message:', error);

        // Update status to failed
        setActiveChatSessions((prev) => {
          const updated = new Map(prev);
          if (updated.has(normalizedTripId)) {
            const session = updated.get(normalizedTripId);
            const messages = session.messages.map((msg) =>
              msg.id === optimisticMessage.id
                ? { ...msg, status: 'failed' }
                : msg
            );
            updated.set(normalizedTripId, { ...session, messages });
          }
          return updated;
        });

        throw error;
      }
    },
    [user]
  );

  /**
   * Get messages for a specific trip
   * @param {string} tripId
   * @returns {Array}
   */
  const getMessages = useCallback(
    (tripId) => {
      const normalizedTripId = String(tripId);
      const session = activeChatSessions.get(normalizedTripId);
      return session ? session.messages : [];
    },
    [activeChatSessions]
  );

  /**
   * Get unread count for a trip
   * @param {string} tripId
   * @returns {number}
   */
  const getUnreadCount = useCallback(
    (tripId) => {
      return unreadCounts.get(tripId) || 0;
    },
    [unreadCounts]
  );

  /**
   * Mark chat as read
   * @param {string} tripId
   */
  const markAsRead = useCallback((tripId) => {
    setUnreadCounts((prev) => {
      const updated = new Map(prev);
      updated.delete(tripId);
      return updated;
    });
  }, []);

  /**
   * Close a chat session
   * @param {string} tripId
   */
  const closeChatSession = useCallback((tripId) => {
    setActiveChatSessions((prev) => {
      const updated = new Map(prev);
      updated.delete(tripId);
      return updated;
    });
  }, []);

  /**
   * Get total unread message count
   * @returns {number}
   */
  const getTotalUnreadCount = useCallback(() => {
    return Array.from(unreadCounts.values()).reduce((sum, count) => sum + count, 0);
  }, [unreadCounts]);

  const value = {
    activeChatSessions,
    connectionStatus,
    unreadCounts,
    sendError,
    isConnected: connectionStatus === 'connected',
    initializeChatSession,
    sendMessage,
    getMessages,
    getUnreadCount,
    getTotalUnreadCount,
    markAsRead,
    closeChatSession,
    clearSendError,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
