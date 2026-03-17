// src/pages/chat/ChatPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { fetchChatHistory, getChatParticipants } from '../../services/api';
import { getChatRestriction } from '../../utils/chatRestrictions';
import ChatWindow from '../../components/chat/ChatWindow';
import styles from './ChatPage.module.css';

const ChatPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    initializeChatSession,
    sendMessage,
    getMessages,
    connectionStatus,
    sendError,
    clearSendError,
  } = useChat();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [rideInfo, setRideInfo] = useState(null);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [disabledMessage, setDisabledMessage] = useState('');

  useEffect(() => {
    if (tripId) {
      loadChatData();
    }
  }, [tripId]);

  const loadChatData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch chat history
      const history = await fetchChatHistory(tripId);

      // Fetch participants / ride info (backend returns ride status/chat flags)
      let participants = null;
      try {
        participants = await getChatParticipants(tripId);
      } catch (err) {
        // Non-fatal: continue with history-only view
        console.warn('Failed to fetch chat participants:', err);
      }

      // Determine other user from participants response OR from history
      let other = null;
      if (participants && Array.isArray(participants.participants)) {
        const p = participants.participants.find((p) => String(p.id) !== String(user?.id));
        if (p) other = { id: p.id, name: p.name || `User ${p.id}` };
      }

      if (!other && history.length > 0) {
        const firstMessage = history[0];
        const otherUserId =
          String(firstMessage.senderId) === String(user?.id)
            ? firstMessage.recipientId
            : firstMessage.senderId;

        other = { id: otherUserId, name: `User ${otherUserId}` };
      }

      setOtherUser(other);

      // Derive ride info and chat availability from participants payload when available
      const rideFromParticipants = participants?.ride || participants?.trip || participants?.rideInfo || null;
      const restriction = getChatRestriction({ rideInfo: rideFromParticipants, participants });
      setRideInfo(restriction.rideInfo);
      setChatDisabled(restriction.disabled);
      setDisabledMessage(restriction.message);

      // Initialize chat session (still show history even when disabled)
      initializeChatSession(tripId, history, other);
    } catch (err) {
      console.error('Failed to load chat:', err);
      setError(err.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content) => {
    if (!otherUser?.id) {
      throw new Error('Recipient information is missing');
    }

    await sendMessage(tripId, otherUser.id, content);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const messages = getMessages(tripId);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={48} />
        <p className={styles.loadingText}>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className={styles.chatPage}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={handleBack}
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>

        <div className={styles.headerContent}>
          <div className={styles.userAvatar}>
            {otherUser?.name?.charAt(0).toUpperCase() || '?'}
          </div>

          <div className={styles.headerInfo}>
            <h1 className={styles.userName}>{otherUser?.name || 'Chat'}</h1>
            {rideInfo && (
              <p className={styles.rideInfo}>
                {rideInfo.from} → {rideInfo.to}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className={styles.chatArea}>
        <ChatWindow
          messages={messages}
          currentUserId={user?.id}
          otherUser={otherUser}
          onSendMessage={handleSendMessage}
          chatDisabled={chatDisabled}
          disabledMessage={disabledMessage}
          loading={false}
          error={error}
          connectionStatus={connectionStatus}
          sendError={sendError}
          onClearSendError={clearSendError}
        />
      </div>
    </div>
  );
};

export default ChatPage;
