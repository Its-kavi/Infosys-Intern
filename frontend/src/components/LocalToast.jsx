import React from 'react';
import styles from './NotificationToast.module.css';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const LocalToast = ({ toasts, onRemove }) => {
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
            {toasts.map(toast => (
                <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
                    <div className={styles.icon}>{getIcon(toast.type)}</div>
                    <div className={styles.content}>
                        <h4>{toast.title}</h4>
                        <p>{toast.message}</p>
                        <span className={styles.time}>{toast.timestamp}</span>
                    </div>
                    <button onClick={() => onRemove(toast.id)} className={styles.closeBtn}>
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default LocalToast;
