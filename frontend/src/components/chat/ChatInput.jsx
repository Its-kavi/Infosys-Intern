// src/components/chat/ChatInput.jsx
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import styles from './ChatInput.module.css';

const ChatInput = ({ onSendMessage, disabled = false, placeholder = 'Type a message...' }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim() || isSending || disabled) {
      return;
    }

    setIsSending(true);

    try {
      await onSendMessage(message.trim());
      setMessage('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Message stays in input on failure so user can retry
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const characterCount = message.length;
  const maxCharacters = 1000;
  const isNearLimit = characterCount > maxCharacters * 0.8;

  return (
    <form className={styles.chatInputContainer} onSubmit={handleSubmit}>
      <div className={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, maxCharacters))}
          onKeyPress={handleKeyPress}
          placeholder={disabled ? 'Chat unavailable' : placeholder}
          disabled={disabled || isSending}
          className={styles.textarea}
          rows={1}
        />

        {isNearLimit && (
          <div className={styles.characterCount}>
            {characterCount}/{maxCharacters}
          </div>
        )}
      </div>

      <button
        type="submit"
        className={styles.sendButton}
        disabled={!message.trim() || isSending || disabled}
        aria-label="Send message"
      >
        {isSending ? (
          <Loader2 className={styles.spinner} size={20} />
        ) : (
          <Send size={20} />
        )}
      </button>
    </form>
  );
};

export default ChatInput;
