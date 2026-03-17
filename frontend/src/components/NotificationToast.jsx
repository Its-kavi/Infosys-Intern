import React, { useEffect, useState, createContext, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import styles from './NotificationToast.module.css';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

// Create context for notification updates
const NotificationContext = createContext(null);

export const useNotificationContext = () => {
    const context = useContext(NotificationContext);
    return context || { onNotificationReceived: () => {} };
};

const NotificationToast = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        // Only connect if user is logged in
        if (!user || !user.email) return;

        let stompClient = null;

        try {
            // Create the Stomp Client using SockJS fallback
            const socketFactory = () => new SockJS('http://localhost:8080/ws');
            stompClient = Stomp.over(socketFactory);

            // Disable debug logs to keep console clean
            stompClient.debug = () => {};

            stompClient.connect(
                {},
                () => {
                    // Connection Success Callback
                    console.log("✅ WebSocket Connected for " + user.email);

                    // Subscribe to user-specific channel
                    stompClient.subscribe(`/topic/user/${user.email}`, (message) => {
                        if (message.body) {
                            const notification = JSON.parse(message.body);
                            
                            // Trigger callback for unread count update if unreadCount is in payload
                            if (notification.unreadCount !== undefined) {
                                // Dispatch custom event for Navbar to listen
                                window.dispatchEvent(new CustomEvent('notification-count-update', {
                                    detail: { unreadCount: notification.unreadCount }
                                }));
                            }
                            
                            window.dispatchEvent(new CustomEvent('notification-received', {
                                detail: notification
                            }));

                            addNotification(notification);
                        }
                    });
                },
                (error) => {
                    // Connection Error Callback
                    console.error("❌ WebSocket Connection Error:", error);
                }
            );
        } catch (err) {
            console.error("WebSocket Init Error:", err);
        }

        // Cleanup on unmount
        return () => {
            if (stompClient && stompClient.connected) {
                stompClient.disconnect();
            }
        };
    }, [user?.email]); // Depend on email to reconnect if user changes

    const addNotification = (notif) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { ...notif, id }]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            removeNotification(id);
        }, 5000);
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const getIcon = (type) => {
        switch (type) {
            case 'SUCCESS': return <CheckCircle size={20} />;
            case 'ERROR': return <XCircle size={20} />;
            case 'WARNING': return <AlertTriangle size={20} />;
            default: return <Info size={20} />;
        }
    };

    return (
        <div className={styles.container}>
            {notifications.map(n => (
                <div key={n.id} className={`${styles.toast} ${styles[n.type]}`}>
                    <div className={styles.icon}>{getIcon(n.type)}</div>
                    <div className={styles.content}>
                        <h4>{n.title}</h4>
                        <p>{n.message}</p>
                        <span className={styles.time}>{n.timestamp}</span>
                    </div>
                    <button onClick={() => removeNotification(n.id)} className={styles.closeBtn}>
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default NotificationToast;
