// src/components/chat/ChatModal.jsx
import { useEffect, useState } from 'react';
import { X, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { fetchChatHistory, getChatParticipants } from '../../services/api';
import { getChatRestriction } from '../../utils/chatRestrictions';
import ChatWindow from './ChatWindow';
import styles from './ChatModal.module.css';

const ChatModal = ({ isOpen, onClose, tripId, otherUser, rideInfo = null }) => {
  const { user } = useAuth();
  const {
    initializeChatSession,
    sendMessage,
    getMessages,
    connectionStatus,
    activeChatSessions,
    sendError,
    clearSendError,
  } = useChat();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolvedOtherUser, setResolvedOtherUser] = useState(otherUser);
  const [resolvedRideInfo, setResolvedRideInfo] = useState(rideInfo);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [disabledMessage, setDisabledMessage] = useState('');

  useEffect(() => {
    if (isOpen && tripId) {
      loadChatHistory();
    }
  }, [isOpen, tripId]);

  useEffect(() => {
    setResolvedOtherUser(otherUser);
  }, [otherUser]);

  useEffect(() => {
    setResolvedRideInfo(rideInfo);
  }, [rideInfo]);

  const loadChatHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const history = await fetchChatHistory(tripId);
      let participants = null;
      try {
        participants = await getChatParticipants(tripId);
      } catch (err) {
        console.warn('Failed to fetch chat participants:', err);
      }

      let derivedOtherUser = otherUser;
      if (!derivedOtherUser && participants && Array.isArray(participants.participants)) {
        const participant = participants.participants.find((p) => String(p.id) !== String(user?.id));
        if (participant) {
          derivedOtherUser = {
            id: participant.id,
            name: participant.name || `User ${participant.id}`,
          };
        }
      }

      if (!derivedOtherUser && history.length > 0) {
        const firstMessage = history[0];
        const otherUserId =
          String(firstMessage.senderId) === String(user?.id)
            ? firstMessage.recipientId
            : firstMessage.senderId;
        derivedOtherUser = { id: otherUserId, name: `User ${otherUserId}` };
      }

      const rideFromParticipants = participants?.ride || participants?.trip || participants?.rideInfo || null;
      const restriction = getChatRestriction({
        rideInfo: rideFromParticipants || resolvedRideInfo || rideInfo || null,
        participants,
      });

      setResolvedRideInfo(restriction.rideInfo || rideFromParticipants || resolvedRideInfo || rideInfo || null);
      setResolvedOtherUser(derivedOtherUser);
      setChatDisabled(restriction.disabled);
      setDisabledMessage(restriction.message);

      initializeChatSession(tripId, history, derivedOtherUser);
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setError(err.message || 'Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content) => {
    if (chatDisabled) {
      throw new Error('Chat is disabled for this ride');
    }

    if (!resolvedOtherUser?.id) {
      throw new Error('Recipient information is missing');
    }

    await sendMessage(tripId, resolvedOtherUser.id, content);
  };

  const handleClose = () => {
    onClose();
  };

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const normalizedTripId = String(tripId);
  const messages = activeChatSessions.get(normalizedTripId)?.messages || [];

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.userAvatar}>
              {otherUser?.name ? (
                otherUser.name.charAt(0).toUpperCase()
              ) : (
                <User size={20} />
              )}
            </div>

            <div className={styles.headerInfo}>
              <h3 className={styles.userName}>
                {resolvedOtherUser?.name || otherUser?.name || 'Chat'}
              </h3>
              {resolvedRideInfo && (
                <p className={styles.rideInfo}>
                  {resolvedRideInfo.from} → {resolvedRideInfo.to}
                </p>
              )}
            </div>
          </div>

          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close chat"
          >
            <X size={24} />
          </button>
        </div>

        {/* Chat Window */}
        <div className={styles.modalBody}>
          <ChatWindow
            messages={messages}
            currentUserId={user?.id}
            otherUser={resolvedOtherUser}
            onSendMessage={handleSendMessage}
            loading={loading}
            error={error}
            connectionStatus={connectionStatus}
            chatDisabled={chatDisabled}
            disabledMessage={disabledMessage}
            sendError={sendError}
            onClearSendError={clearSendError}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
