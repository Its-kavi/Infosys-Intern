// src/components/chat/ConnectionStatus.jsx
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import styles from './ConnectionStatus.module.css';

const ConnectionStatus = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Connected',
          className: styles.connected,
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'Disconnected',
          className: styles.disconnected,
        };
      case 'reconnecting':
        return {
          icon: Loader2,
          text: 'Reconnecting...',
          className: styles.reconnecting,
          spinning: true,
        };
      case 'failed':
        return {
          icon: AlertCircle,
          text: 'Connection Failed',
          className: styles.failed,
        };
      default:
        return {
          icon: Loader2,
          text: 'Connecting...',
          className: styles.connecting,
          spinning: true,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Don't show status when connected
  if (status === 'connected') {
    return null;
  }

  return (
    <div className={`${styles.statusBanner} ${config.className}`}>
      <Icon
        size={16}
        className={config.spinning ? styles.spinner : ''}
      />
      <span className={styles.statusText}>{config.text}</span>
    </div>
  );
};

export default ConnectionStatus;
