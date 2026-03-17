import React, { useState } from 'react';
import { createOrder, verifyPayment } from '../services/api';
import { loadRazorpay } from '../utils/loadRazorpay.js';
import Button from './ui/Button';
import LocalToast from './LocalToast';
import { useToast } from '../utils/useToast.js';
import styles from './PaymentModal.module.css';

const PaymentModal = ({ booking, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const { toasts, showToast, removeToast } = useToast();

    const handlePayment = async () => {
        setLoading(true);
        setErrorMessage('');
        setStatus('processing');

        try {
            const orderData = await createOrder(booking.id);
            console.log("Order Created:", orderData); // Debug log

            if (orderData.provider === 'RAZORPAY') {
                const isLoaded = await loadRazorpay();
                if (!isLoaded) {
                    throw new Error("Razorpay SDK failed to load. Check your internet connection.");
                }

                const options = {
                    key: orderData.key,
                    amount: orderData.amount,
                    currency: "INR",
                    name: "RideConnect",
                    description: `Payment for Ride #${booking.ride.id}`,
                    order_id: orderData.orderId,
                    handler: async function (response) {
                        console.log("Razorpay Response:", response);
                        setStatus('confirming'); // Show waiting screen
                        try {
                            await verifyPayment({
                                bookingId: booking.id,
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature,
                                provider: 'RAZORPAY'
                            });
                            setStatus('success');
                            setTimeout(onSuccess, 1500);
                        } catch (err) {
                            console.error(err);
                            showToast("Verification Failed: " + err.message, "ERROR");
                            setStatus('error');
                        }
                    },
                    modal: {
                        ondismiss: function () {
                            // If dismissed while confirming, don't revert to cancelled immediately unless verify failed?
                            // Actually ondismiss only calls if user closes popup.
                            if (status !== 'confirming') {
                                setStatus('cancelled');
                                setLoading(false);
                            }
                        }
                    },
                    prefill: {
                        name: booking.passenger.name || "User",
                        email: booking.passenger.email || "user@example.com",
                    },
                    theme: { color: "#3399cc" }
                };

                const rzp = new window.Razorpay(options);
                rzp.open();
                setLoading(false);

            } else {
                // Mock Flow
                setTimeout(async () => {
                    try {
                        await verifyPayment({
                            bookingId: booking.id,
                            orderId: orderData.orderId,
                            paymentId: "pay_mock_" + Date.now(),
                            signature: "dummy_signature",
                            provider: 'MOCK'
                        });
                        setStatus('success');
                        setTimeout(onSuccess, 1500);
                    } catch (err) {
                        setStatus('error');
                        setLoading(false);
                    }
                }, 2000);
            }

        } catch (err) {
            console.error(err);
            setErrorMessage(err.message);
            setStatus('error');
            setLoading(false);
        }
    };

    if (status === 'confirming') {
        return (
            <div className={styles.modalOverlay}>
                <div className={styles.modalContent} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className={styles.spinner}></div>
                    <h2 style={{ marginTop: '1.5rem', color: '#0f4c81' }}>Confirming Payment...</h2>
                    <p style={{ color: '#64748b' }}>Please wait while we verify your transaction.</p>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className={styles.modalOverlay}>
                <div className={styles.modalContent}>
                    <h2 style={{ color: 'green' }}>Payment Successful!</h2>
                    <p>Your ride is confirmed.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2>Confirm Payment</h2>
                <div className={styles.summary}>
                    <p><strong>Ride:</strong> {booking.ride.source} → {booking.ride.destination}</p>
                    <p><strong>Seats:</strong> {booking.seatsBooked}</p>
                    <p className={styles.total}>Total: ₹{booking.ride.pricePerSeat * booking.seatsBooked} + Taxes</p>
                </div>

                {status === 'error' && <p className={styles.error}>{errorMessage || 'Payment Failed. Try again.'}</p>}
                {status === 'cancelled' && <p className={styles.warning}>Payment was cancelled.</p>}

                <div className={styles.actions}>
                    <Button onClick={onClose} variant="secondary" disabled={loading}>Close</Button>
                    <Button onClick={handlePayment} disabled={loading}>
                        {loading ? 'Processing...' : 'Pay Now'}
                    </Button>
                </div>
            </div>
            <LocalToast toasts={toasts} onRemove={removeToast} />
        </div>
    );
};

export default PaymentModal;