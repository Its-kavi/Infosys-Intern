import React from 'react';
import Button from './ui/Button';
import { AlertTriangle, Info, HelpCircle } from 'lucide-react';
import styles from './ConfirmModal.module.css';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Confirm Action", 
    message, 
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "warning" // warning, danger, info
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return <AlertTriangle size={48} color="#dc3545" />;
            case 'info': return <Info size={48} color="#0d6efd" />;
            default: return <HelpCircle size={48} color="#ffc107" />;
        }
    };

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.iconContainer}>
                    {getIcon()}
                </div>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    <Button onClick={onClose} variant="secondary">
                        {cancelText}
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        className={type === 'danger' ? styles.dangerBtn : ''}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
