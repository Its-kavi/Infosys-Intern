import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import Button from './ui/Button';
import { submitReview } from '../services/api';
import styles from './ReviewModal.module.css';

const ReviewModal = ({ booking, onClose, onSuccess }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [hoveredStar, setHoveredStar] = useState(0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Handle both booking.id (passenger) and booking.bookingId (driver)
            const bookingId = booking.id || booking.bookingId;
            await submitReview(bookingId, rating, comment);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Review failed", error);
            alert("Failed to submit review. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className={styles.closeBtn}>
                    <X size={20} />
                </button>

                <div className={styles.header}>
                    <h2>Rate Your Ride</h2>
                    <p>How was your experience?</p>
                </div>

                <div className={styles.ratingSection}>
                    <div className={styles.stars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                size={40}
                                fill={(hoveredStar || rating) >= star ? "#fbbf24" : "none"}
                                color={(hoveredStar || rating) >= star ? "#fbbf24" : "#cbd5e1"}
                                className={styles.star}
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoveredStar(star)}
                                onMouseLeave={() => setHoveredStar(0)}
                            />
                        ))}
                    </div>
                    <div className={styles.ratingText}>
                        {rating === 5 && "Excellent!"}
                        {rating === 4 && "Great!"}
                        {rating === 3 && "Good"}
                        {rating === 2 && "Fair"}
                        {rating === 1 && "Poor"}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <label className={styles.label}>Your Review (Optional)</label>
                    <textarea
                        placeholder="Tell us more about your experience..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className={styles.textarea}
                        rows={5}
                    />
                    <div className={styles.actions}>
                        <Button 
                            type="button" 
                            onClick={onClose} 
                            style={{ 
                                background: 'transparent', 
                                color: '#64748b', 
                                border: '1px solid #e2e8f0'
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Review'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;