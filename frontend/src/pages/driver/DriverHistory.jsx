import React, { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import Button from '../../components/ui/Button';
import { getTransactionHistory, getDriverStats } from '../../services/api'; // Added getDriverStats
import { generateDriverInvoice } from '../../utils/invoiceGenerator';
import { Link } from 'react-router-dom';
import styles from './DriverHistory.module.css';
import { Download, Wallet, ArrowDownLeft, Car, Users, CheckCircle, Plus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'; // Added Recharts

const DriverHistory = () => {
    const [payments, setPayments] = useState([]);
    const [stats, setStats] = useState([]); // State for chart
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [totalRefunded, setTotalRefunded] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch History List
                const historyData = await getTransactionHistory();
                setPayments(historyData || []);

                // Calculate Totals
                const earnings = (historyData || [])
                    .filter(p => p.status === 'SUCCESS')
                    .reduce((sum, p) => sum + p.amount, 0);
                setTotalEarnings(Math.round(earnings / 1.07)); // Net Income

                const refunded = (historyData || [])
                    .filter(p => p.status === 'REFUNDED')
                    .reduce((sum, p) => sum + p.amount, 0);
                setTotalRefunded(refunded);

                // 2. Fetch Chart Data
                const statsData = await getDriverStats();
                setStats(statsData || []);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className={styles.pageWrapper}>
            <Navbar />
            <div className="container">
                <h1 className={styles.pageTitle}>My Earnings</h1>


                {/* 1. Motivational Hero (Only for Empty State) */}
                {payments.length === 0 && (
                    <div className={styles.heroCard}>
                        <div className={styles.heroContent}>
                            <h2>Start Earning with RideConnect</h2>
                            <p>
                                Publish your first ride to start generating income. Earnings are credited immediately after a trip is completed.
                            </p>
                            <Link to="/post-ride" style={{ textDecoration: 'none' }}>
                                <Button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '0.95rem' }}>
                                    <Plus size={18} /> Publish a Ride
                                </Button>
                            </Link>

                        </div>

                        {/* Progress Checklist (Visual Timeline) */}
                        <div className={styles.heroSteps}>
                            {/* Step 1: Completed */}
                            <div className={`${styles.stepItem} ${styles.stepCompleted}`}>
                                <div className={styles.stepIcon}><CheckCircle size={18} /></div>
                                <div className={styles.stepLabel}>Profile<br />Verified</div>
                            </div>

                            {/* Step 2: Active (Current Focus) */}
                            <div className={`${styles.stepItem} ${styles.stepActive}`}>
                                <div className={styles.stepIcon}>2</div>
                                <div className={styles.stepLabel}>Publish<br />Ride</div>
                            </div>

                            {/* Step 3: Future (Muted) */}
                            <div className={styles.stepItem}>
                                <div className={styles.stepIcon}>3</div>
                                <div className={styles.stepLabel}>Get<br />Bookings</div>
                            </div>

                            {/* Step 4: Future (Muted) */}
                            <div className={styles.stepItem}>
                                <div className={styles.stepIcon}>4</div>
                                <div className={styles.stepLabel}>Earn<br />Money</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Earnings Trend Chart (Only if Data Exists) */}
                {stats.length > 0 && payments.length > 0 && (
                    <div className={styles.chartSection}>
                        <h3>Weekly Earnings Trend</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <AreaChart data={stats}>
                                    <defs>
                                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => [`₹${value}`, 'Earnings']} />
                                    <Area type="monotone" dataKey="amount" stroke="#10b981" fillOpacity={1} fill="url(#colorEarnings)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                <div className={styles.statsContainer}>
                    <div className={`${styles.statsCard} ${styles.earningsCard}`}>
                        <div className={styles.statsIcon}><Wallet size={24} /></div>
                        <div>
                            <h3>Net Income</h3>
                            <h2 className={styles.earningsAmount}>₹{totalEarnings}</h2>
                        </div>
                    </div>
                    <div className={`${styles.statsCard} ${styles.refundCard}`}>
                        <div className={styles.statsIcon}><ArrowDownLeft size={24} /></div>
                        <div>
                            <h3>Refunded</h3>
                            <h2 className={styles.refundAmount}>₹{totalRefunded}</h2>
                        </div>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    {loading ? <p>Loading history...</p> : payments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                            <Car size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>No completed trips yet</p>
                            <p>History will appear here once you complete a ride.</p>
                        </div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Passenger</th>
                                    <th>Ride Details</th>
                                    <th>Total Fare</th>
                                    <th>Status</th>
                                    <th>Receipt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <div className={styles.dateCell}>
                                                {new Date(p.paymentTime).toLocaleDateString('en-GB')}
                                                <small>{new Date(p.paymentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                            </div>
                                        </td>
                                        <td>{p.booking?.passenger?.name || 'N/A'}</td>
                                        <td>
                                            <div className={styles.route}>
                                                {p.booking?.ride?.source} <span className={styles.arrow}>→</span> {p.booking?.ride?.destination}
                                            </div>
                                        </td>
                                        <td className={p.status === 'REFUNDED' ? styles.textRed : styles.textGreen}>
                                            {p.status === 'REFUNDED' ? '-' : '+'} ₹{p.amount?.toFixed(2)}
                                        </td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${styles[p.status]}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td>
                                            {p.status === 'SUCCESS' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => generateDriverInvoice(p)}
                                                    className={styles.downloadBtn}
                                                >
                                                    <Download size={14} /> PDF
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DriverHistory;