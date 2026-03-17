import React, { useEffect, useState } from 'react';
import { getTransactionHistory } from '../services/api';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import styles from './TransactionHistory.module.css';
import { generatePassengerInvoice } from '../utils/invoiceGenerator';
import { Download } from 'lucide-react';

const TransactionHistory = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await getTransactionHistory();
                setPayments(data || []);
            } catch (err) {
                console.error("Failed to load history", err);
                setError("Failed to load transaction history.");
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    return (
        <div className={styles.pageWrapper}>
            <Navbar />
            <div className="container" style={{ marginTop: '2rem' }}>
                <h1 className={styles.pageTitle}>Transaction History</h1>

                {loading && <p>Loading transactions...</p>}
                {error && <p className={styles.error}>{error}</p>}

                {!loading && !error && payments.length === 0 && (
                    <p>No transactions found.</p>
                )}

                {!loading && !error && payments.length > 0 && (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Ride Details</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Invoice</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p) => {
                                    const statusClass =
                                        p.status === 'SUCCESS'
                                            ? styles.success
                                            : p.status === 'FAILED'
                                                ? styles.failed
                                                : styles.failed;

                                    return (
                                    <tr key={p.id}>
                                        <td>
                                            {new Date(p.paymentTime).toLocaleDateString('en-GB')}
                                            <span className={styles.time}>
                                                {new Date(p.paymentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.route}>
                                                {p.booking?.ride?.source} <span className={styles.arrow}>→</span> {p.booking?.ride?.destination}
                                            </div>
                                            <div className={styles.subText}>Booking #{p.booking?.id}</div>
                                        </td>
                                        <td className={styles.amount}>
                                            ₹{(p.amount).toFixed(2)}
                                        </td>
                                        <td>
                                            <span className={`${styles.status} ${statusClass}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td>
                                            {(p.status === 'SUCCESS' || p.status === 'REFUNDED') && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => generatePassengerInvoice(p)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '5px', borderColor: '#0f4c81', color: '#0f4c81' }}
                                                >
                                                    <Download size={14} /> PDF
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransactionHistory;
