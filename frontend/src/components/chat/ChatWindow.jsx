// src/components/chat/ChatWindow.jsx
import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import ConnectionStatus from './ConnectionStatus';
import styles from './ChatWindow.module.css';

const ChatWindow = ({
  messages = [],
  currentUserId,
  otherUser,
  onSendMessage,
  loading = false,
  error = null,
  connectionStatus = 'connected',
  emptyStateMessage = 'No messages yet. Start the conversation!',
  chatDisabled = false,
  disabledMessage = '',
  sendError = '',
  onClearSendError = null,
}) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom('smooth');
    }
  }, [messages, shouldAutoScroll]);

  // Check if user has scrolled up
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isScrolledToBottom =
      container.scrollHeight - container.scrollTop <= container.clientHeight + 100;

    setShouldAutoScroll(isScrolledToBottom);
    setShowScrollButton(!isScrolledToBottom && messages.length > 0);
  };

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const groupedMessages = groupMessagesByDate(messages);

  if (loading) {
    return (
      <div className={styles.chatWindow}>
        <div className={styles.centerContent}>
          <Loader2 className={styles.spinner} size={32} />
          <p className={styles.loadingText}>Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.chatWindow}>
        <div className={styles.centerContent}>
          <AlertCircle size={32} className={styles.errorIcon} />
          <p className={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatWindow}>
      <ConnectionStatus status={connectionStatus} />

      {sendError && (
        <div className={styles.sendErrorBanner} role="alert">
          <p className={styles.sendErrorText}>{sendError}</p>
          {onClearSendError && (
            <button
              className={styles.sendErrorDismiss}
              type="button"
              onClick={onClearSendError}
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {chatDisabled && (
        <div className={styles.chatDisabledBanner} role="status">
          <p className={styles.chatDisabledText}>{disabledMessage || 'Chat is disabled for this ride.'}</p>
        </div>
      )}

      <div
        className={styles.messagesContainer}
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>💬</div>
            <p className={styles.emptyStateText}>{emptyStateMessage}</p>
          </div>
        ) : (
          <>
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className={styles.dateSeparator}>
                  <span>{date}</span>
                </div>
                {msgs.map((message, index) => (
                  <ChatBubble
                    key={message.id || index}
                    message={message}
                    isOwnMessage={String(message.senderId) === String(currentUserId)}
                    otherUserName={otherUser?.name || 'User'}
                    showAvatar={
                      index === 0 ||
                      msgs[index - 1].senderId !== message.senderId
                    }
                  />
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {showScrollButton && (
        <button
          className={styles.scrollToBottomButton}
          onClick={() => scrollToBottom('smooth')}
          aria-label="Scroll to bottom"
        >
          ↓ New messages
        </button>
      )}

      <ChatInput
        onSendMessage={onSendMessage}
        disabled={connectionStatus !== 'connected' || chatDisabled}
        placeholder={
          chatDisabled
            ? 'Chat unavailable'
            : connectionStatus === 'connected'
            ? 'Type a message...'
            : 'Connecting...'
        }
      />
    </div>
  );
};

// Helper function to group messages by date
const groupMessagesByDate = (messages) => {
  const groups = {};

  messages.forEach((message) => {
    const date = new Date(message.timestamp);
    const dateKey = formatDateKey(date);

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }

    groups[dateKey].push(message);
  });

  return groups;
};

const formatDateKey = (date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) {
    return 'Today';
  } else if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }
};

const isSameDay = (date1, date2) => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

export default ChatWindow;
