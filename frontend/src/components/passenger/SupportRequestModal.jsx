import React, { useEffect, useState } from 'react';
import Button from '../ui/Button';
import styles from './SupportRequestModal.module.css';
import { uploadImage } from '../../services/api';

const SupportRequestModal = ({ isOpen, booking, onClose, onSubmit }) => {
    const [issueDescription, setIssueDescription] = useState('');
    const [refundRequested, setRefundRequested] = useState(false);
    const [evidenceUrls, setEvidenceUrls] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!booking) return;
        setIssueDescription('');
        setRefundRequested(false);
        setEvidenceUrls([]);
        setError('');
        setUploading(false);
    }, [booking]);

    if (!isOpen || !booking) return null;

    const handleEvidenceSelected = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setError('');
        setUploading(true);
        try {
            const uploadedUrls = [];
            for (const file of files) {
                const url = await uploadImage(file);
                if (url) uploadedUrls.push(url);
            }
            setEvidenceUrls((prev) => [...prev, ...uploadedUrls]);
        } catch (err) {
            setError(err?.message || 'Failed to upload evidence');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const removeEvidenceAt = (index) => {
        setEvidenceUrls((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!issueDescription.trim()) {
            setError('Please describe the issue.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await onSubmit({
                bookingId: booking.id,
                issueDescription: issueDescription.trim(),
                refundRequested,
                evidenceUrls
            });
        } catch (e) {
            setError(e.message || 'Failed to submit support request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true">
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>Report an Issue</h3>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close">x</button>
                </div>

                <div className={styles.content}>
                    <div className={styles.field}>
                        <label>Booking</label>
                        <div className={styles.metaRow}>
                            <span>#{booking.id}</span>
                            <span>{booking.ride?.source} to {booking.ride?.destination}</span>
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label>Issue Description</label>
                        <textarea
                            rows={4}
                            value={issueDescription}
                            onChange={(e) => setIssueDescription(e.target.value)}
                            placeholder="Describe what happened during or after the ride"
                        />
                    </div>

                    <div className={styles.field}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                checked={refundRequested}
                                onChange={(e) => setRefundRequested(e.target.checked)}
                                disabled={submitting || uploading}
                            />
                            Request a refund (support will review)
                        </label>
                    </div>

                    <div className={styles.field}>
                        <label>Evidence (optional)</label>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleEvidenceSelected}
                            disabled={submitting || uploading}
                        />
                        {uploading && <div style={{ marginTop: '0.5rem' }}>Uploading...</div>}

                        {evidenceUrls.length > 0 && (
                            <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                                {evidenceUrls.map((url, idx) => (
                                    <div key={`${url}-${idx}`} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <a href={url} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
                                            {url}
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => removeEvidenceAt(idx)}
                                            disabled={submitting || uploading}
                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && <div className={styles.error}>{error}</div>}
                </div>

                <div className={styles.actions}>
                    <Button variant="outline" onClick={onClose} disabled={submitting || uploading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting || uploading}>
                        {submitting ? 'Submitting...' : 'Submit Request'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SupportRequestModal;
