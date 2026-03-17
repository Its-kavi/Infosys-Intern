// src/components/chat/ChatBubble.jsx
import { memo } from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import styles from './ChatBubble.module.css';

const ChatBubble = memo(({ message, isOwnMessage, showAvatar = true, otherUserName = 'User' }) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusIcon = () => {
    if (!isOwnMessage) return null;

    const status = message.status || 'sent';

    switch (status) {
      case 'sending':
        return <Clock className={styles.statusIcon} size={14} />;
      case 'sent':
        return <CheckCheck className={styles.statusIcon} size={14} />;
      case 'failed':
        return <AlertCircle className={`${styles.statusIcon} ${styles.error}`} size={14} />;
      default:
        return <Check className={styles.statusIcon} size={14} />;
    }
  };

  return (
    <div
      className={`${styles.chatBubbleContainer} ${
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      }`}
    >
      {!isOwnMessage && showAvatar && (
        <div className={styles.avatar}>
          {otherUserName.charAt(0).toUpperCase()}
        </div>
      )}

      <div className={styles.bubbleWrapper}>
        {!isOwnMessage && (
          <div className={styles.senderName}>{otherUserName}</div>
        )}

        <div
          className={`${styles.bubble} ${
            isOwnMessage ? styles.ownBubble : styles.otherBubble
          } ${message.status === 'failed' ? styles.failedBubble : ''}`}
        >
          <div className={styles.messageContent}>{message.content}</div>

          <div className={styles.messageFooter}>
            <span className={styles.timestamp}>
              {formatTime(message.timestamp)}
            </span>
            {getStatusIcon()}
          </div>
        </div>

        {message.status === 'failed' && (
          <div className={styles.errorMessage}>Failed to send. Tap to retry.</div>
        )}
      </div>

      {isOwnMessage && showAvatar && (
        <div className={`${styles.avatar} ${styles.ownAvatar}`}>You</div>
      )}
    </div>
  );
});

ChatBubble.displayName = 'ChatBubble';

export default ChatBubble;
