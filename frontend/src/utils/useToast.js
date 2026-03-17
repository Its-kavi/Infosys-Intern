import { useState, useCallback } from 'react';

export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'INFO', title = '') => {
        const id = Date.now();
        const toast = {
            id,
            message,
            type, // SUCCESS, ERROR, WARNING, INFO
            title: title || (type === 'ERROR' ? 'Error' : type === 'SUCCESS' ? 'Success' : 'Notification'),
            timestamp: new Date().toLocaleTimeString()
        };

        setToasts(prev => [...prev, toast]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, showToast, removeToast };
};
