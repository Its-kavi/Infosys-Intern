// src/components/chat/ChatButton.jsx
import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import ChatModal from './ChatModal';
import styles from './ChatButton.module.css';

const ChatButton = ({
  tripId,
  otherUser,
  rideInfo = null,
  variant = 'primary',
  label = 'Chat',
  showIcon = true,
  className = '',
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  return (
    <>
      <button
        className={`${styles.chatButton} ${styles[variant]} ${className}`}
        onClick={handleOpenChat}
        aria-label={`Chat with ${otherUser?.name || 'user'}`}
      >
        {showIcon && <MessageCircle size={18} />}
        <span>{label}</span>
      </button>

      <ChatModal
        isOpen={isChatOpen}
        onClose={handleCloseChat}
        tripId={tripId}
        otherUser={otherUser}
        rideInfo={rideInfo}
      />
    </>
  );
};

export default ChatButton;
