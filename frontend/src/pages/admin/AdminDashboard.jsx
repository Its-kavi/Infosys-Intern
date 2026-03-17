import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import StatCard from '../../components/admin/StatCard';
import ConfirmModal from '../../components/ConfirmModal';
import LocalToast from '../../components/LocalToast';
import { useToast } from '../../utils/useToast';
import { getAllUsers, getAllRides, getAllBookings, verifyDriver, blockUser, cancelRideAdmin, getAdminStats, getAdminSupportRequests, updateSupportRequest } from '../../services/api';
import styles from './AdminDashboard.module.css';
import { Users, Car, IndianRupee, MapPin, Activity, LayoutDashboard, LogOut, Menu, Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown, XCircle, CheckCircle, ChevronDown, ChevronUp, UserCircle, Mail, Phone, CreditCard, User, ShieldCheck, Star, LifeBuoy } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend, ReferenceLine, LabelList } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const ITEMS_PER_PAGE = 10;
const SUPPORT_ITEMS_PER_PAGE = 20;

const AdminDashboard = () => {
    // Dynamic Chart Data State
    const [chartData, setChartData] = useState([]);
    const [pieData, setPieData] = useState([]);
    const [barData, setBarData] = useState([]);

    const { logout } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('overview');
    // Updated stats state to include cancelledRides
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeRides: 0,
        completedRides: 0,
        totalRevenue: 0,
        cancelledRides: 0,
        refundedAmount: 0
    });
    const [users, setUsers] = useState([]);
    const [rides, setRides] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [supportData, setSupportData] = useState({ items: [], totalElements: 0, totalPages: 0 });

    // Interactive States
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [supportPage, setSupportPage] = useState(0);
    const [supportStatusFilter, setSupportStatusFilter] = useState('');
    const [supportLoading, setSupportLoading] = useState(false);

    const [cancelModal, setCancelModal] = useState({ show: false, rideId: null, reason: '' });
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, type: 'warning' });
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { toasts, showToast, removeToast } = useToast();
    const [supportDecisionModal, setSupportDecisionModal] = useState({ show: false, id: null, status: 'IN_REVIEW', notes: '' });
    
    // New states for ride details
    const [expandedRideId, setExpandedRideId] = useState(null);
    const [rideBookings, setRideBookings] = useState({});
    const [loadingBookings, setLoadingBookings] = useState(false);
    
    // New state for user details
    const [expandedUserId, setExpandedUserId] = useState(null);

    // Initial Data Fetch
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getAdminStats();
                console.log('Admin Stats from backend:', data);
                setStats(data || {
                    totalUsers: 0,
                    activeRides: 0,
                    completedRides: 0,
                    totalRevenue: 0,
                    cancelledRides: 0,
                    refundedAmount: 0
                });
            } catch (error) { console.error(error); }
        };
        fetchStats();
    }, []);

    const fetchSupportRequests = async () => {
        setSupportLoading(true);
        try {
            const data = await getAdminSupportRequests({
                status: supportStatusFilter || undefined,
                page: supportPage,
                size: SUPPORT_ITEMS_PER_PAGE
            });
            const normalized = Array.isArray(data)
                ? { items: data, totalElements: data.length, totalPages: 1 }
                : data?.content
                    ? { items: data.content, totalElements: data.totalElements || data.content.length, totalPages: data.totalPages || 1 }
                    : data;
            setSupportData(normalized || { items: [], totalElements: 0, totalPages: 0 });
        } catch (error) {
            console.error('Failed to fetch support requests', error);
            showToast('Failed to fetch support requests', 'ERROR');
        } finally {
            setSupportLoading(false);
        }
    };

    // Tab Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [usersData, ridesData, statsData, bookingsData] = await Promise.all([
                    getAllUsers(),
                    getAllRides(),
                    getAdminStats(),
                    getAllBookings()
                ]);

                setUsers(usersData || []);
                setRides(ridesData || []);
                setBookings(bookingsData || []);
                setStats(statsData || {});

                // Calculate Chart Data (Revenue per Day for last 7 days)
                const last7Days = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dayName = d.toLocaleString('default', { weekday: 'short' });
                    // Format key as YYYY-MM-DD for comparison
                    const dateKey = d.toISOString().split('T')[0];
                    last7Days.push({ name: dayName, dateKey, revenue: 0 });
                }

                if (bookingsData) {
                    bookingsData.forEach(booking => {
                        if (booking.status === 'COMPLETED' || booking.status === 'CONFIRMED') {
                            // Use paymentTime if available, else bookingTime
                            const date = new Date(booking.bookingTime);
                            const dateKey = date.toISOString().split('T')[0];

                            const dayEntry = last7Days.find(d => d.dateKey === dateKey);
                            if (dayEntry) {
                                // Assume ride price is available in booking or booking.amount
                                // If payment info exists use that, else estimate
                                const amount = booking.payment?.amount || booking.ride?.pricePerSeat || 0;
                                dayEntry.revenue += amount;
                            }
                        }
                    });
                }
                setChartData(last7Days);

                // 2. User Distribution (Pie Chart)
                const driversCount = (usersData || []).filter(u => u.role === 'DRIVER').length;
                const passengerCount = (usersData || []).filter(u => u.role === 'PASSENGER').length;
                setPieData([
                    { name: 'Drivers', value: driversCount },
                    { name: 'Passengers', value: passengerCount }
                ]);

                // 3. Ride Status (Bar Chart)
                const completedRides = (ridesData || []).filter(r => r.status === 'COMPLETED').length;
                const activeRides = (ridesData || []).filter(r => r.status === 'AVAILABLE' || r.status === 'IN_PROGRESS').length;
                const cancelledRides = (ridesData || []).filter(r => r.status === 'CANCELLED').length;
                setBarData([
                    { name: 'Completed', value: completedRides },
                    { name: 'Active', value: activeRides },
                    { name: 'Cancelled', value: cancelledRides }
                ]);

            } catch (err) {
                console.error("Dashboard Load Error:", err);
                showToast("Failed to load dashboard data", "ERROR");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        // Reset interactive states on tab change
        setSearchQuery('');
        setFilterStatus('ALL');
        setCurrentPage(1);
        setSortConfig({ key: null, direction: 'asc' });
        setSupportPage(0);
        setSupportStatusFilter('');
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'support') return;
        fetchSupportRequests();
    }, [activeTab, supportPage, supportStatusFilter]);

    // --- LOGIC: Filter & Sort ---
    const processedData = useMemo(() => {
        let data = activeTab === 'users' ? users : rides;

        // 1. Filter by Search
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            data = data.filter(item =>
                (item.name && item.name.toLowerCase().includes(lowerQuery)) ||
                (item.email && item.email.toLowerCase().includes(lowerQuery)) ||
                (item.driver?.name && item.driver.name.toLowerCase().includes(lowerQuery)) ||
                (item.source && item.source.toLowerCase().includes(lowerQuery)) ||
                (item.destination && item.destination.toLowerCase().includes(lowerQuery))
            );
        }

        // 2. Filter by Status dropdown
        if (filterStatus !== 'ALL') {
            data = data.filter(item => {
                if (activeTab === 'users') {
                    // Start: Normalize properties
                    const isVerified = item.isVerified !== undefined ? item.isVerified : (item.verified !== undefined ? item.verified : false);
                    const isActive = item.isActive !== undefined ? item.isActive : (item.active !== undefined ? item.active : true);
                    // End: Normalize properties

                    if (filterStatus === 'DRIVER') return item.role === 'DRIVER';
                    if (filterStatus === 'PASSENGER') return item.role === 'PASSENGER';
                    if (filterStatus === 'BLOCKED') return !isActive;
                    if (filterStatus === 'PENDING') return !isVerified && item.role === 'DRIVER';
                } else {
                    return item.status === filterStatus;
                }
                return true;
            });
        }

        // 3. Sorting
        if (sortConfig.key) {
            data = [...data].sort((a, b) => {
                // Helper to get nested properties like 'driver.name'
                const getValue = (obj, path) => path.split('.').reduce((o, k) => (o || {})[k], obj);

                const aValue = getValue(a, sortConfig.key);
                const bValue = getValue(b, sortConfig.key);

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [users, rides, activeTab, searchQuery, filterStatus, sortConfig]);

    // --- LOGIC: Pagination ---
    const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
    const paginatedData = activeTab === 'overview'
        ? processedData.slice(0, 5)
        : processedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // For Overview tab, we need separate data for users and rides
    const recentUsers = activeTab === 'overview' ? users.filter(u => u.role !== 'ADMIN').slice(0, 5) : [];
    const recentRides = activeTab === 'overview' ? rides.slice(0, 5) : [];

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // ... Handlers (Logout, Verify, Block, Cancel) ...
    const handleLogout = async () => { 
        await logout(); 
        navigate('/login'); 
    };

    const handleVerify = async (id) => {
        setConfirmModal({
            show: true,
            title: 'Verify Driver',
            message: 'Are you sure you want to verify this driver? This will allow them to post rides.',
            type: 'info',
            onConfirm: async () => {
                try {
                    await verifyDriver(id);
                    setUsers(users.map(u => u.id === id ? { ...u, isVerified: true, verified: true } : u));
                    showToast('Driver verified successfully!', 'SUCCESS');
                } catch (e) {
                    showToast(e.message, 'ERROR');
                }
            }
        });
    };

    const handleBlock = async (id) => {
        setConfirmModal({
            show: true,
            title: 'Block User',
            message: 'Are you sure you want to block this user? They will not be able to access the platform.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await blockUser(id);
                    setUsers(users.map(u => u.id === id ? { ...u, isActive: false, active: false } : u));
                    showToast('User blocked successfully!', 'SUCCESS');
                } catch (e) {
                    showToast(e.message, 'ERROR');
                }
            }
        });
    };

    const openCancelModal = (rideId) => setCancelModal({ show: true, rideId, reason: '' });

    const toggleRideDetails = async (rideId) => {
        if (expandedRideId === rideId) {
            setExpandedRideId(null);
            return;
        }
        
        setExpandedRideId(rideId);
        
        // Fetch bookings if not already loaded
        if (!rideBookings[rideId]) {
            setLoadingBookings(true);
            try {
                const bookings = await getAllBookings();
                const rideSpecificBookings = bookings.filter(b => b.ride?.id === rideId);
                setRideBookings(prev => ({ ...prev, [rideId]: rideSpecificBookings }));
            } catch (error) {
                showToast('Failed to fetch booking details', 'ERROR');
            } finally {
                setLoadingBookings(false);
            }
        }
    };
    
    const toggleUserDetails = (userId) => {
        if (expandedUserId === userId) {
            setExpandedUserId(null);
        } else {
            setExpandedUserId(userId);
        }
    };

    const submitCancel = async () => {
        if (!cancelModal.reason.trim()) {
            showToast('Please provide a reason for cancellation', 'WARNING');
            return;
        }
        try {
            await cancelRideAdmin(cancelModal.rideId, cancelModal.reason);
            showToast('Ride cancelled successfully!', 'SUCCESS');
            setCancelModal({ show: false, rideId: null, reason: '' });
            const ridesData = await getAllRides();
            setRides(ridesData || []);
        } catch (e) {
            showToast(e.message, 'ERROR');
        }
    };

    const openSupportDecision = (id, currentStatus) => {
        setSupportDecisionModal({
            show: true,
            id,
            status: currentStatus || 'IN_REVIEW',
            notes: ''
        });
    };

    const submitSupportDecision = async () => {
        if (!supportDecisionModal.status) {
            showToast('Please choose a status', 'WARNING');
            return;
        }
        try {
            await updateSupportRequest(supportDecisionModal.id, {
                status: supportDecisionModal.status,
                adminNotes: supportDecisionModal.notes.trim() || null
            });
            showToast('Support request updated', 'SUCCESS');
            setSupportDecisionModal({ show: false, id: null, status: 'IN_REVIEW', notes: '' });
            fetchSupportRequests();
        } catch (error) {
            showToast(error.message || 'Failed to update support request', 'ERROR');
        }
    };

    const renderSidebar = () => (
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.mobileOpen : ''}`}>
            <div className={styles.sidebarHeader}>
                <h2>RideConnect</h2>
                <span className={styles.badge}>Admin</span>
            </div>
            <nav className={styles.nav}>
                <button className={`${styles.navItem} ${activeTab === 'overview' ? styles.activeNav : ''}`} onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}>
                    <LayoutDashboard size={20} /> Overview
                </button>
                <button className={`${styles.navItem} ${activeTab === 'users' ? styles.activeNav : ''}`} onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}>
                    <Users size={20} /> User Management
                </button>
                <button className={`${styles.navItem} ${activeTab === 'rides' ? styles.activeNav : ''}`} onClick={() => { setActiveTab('rides'); setSidebarOpen(false); }}>
                    <Car size={20} /> Ride Console
                </button>
                <button className={`${styles.navItem} ${activeTab === 'support' ? styles.activeNav : ''}`} onClick={() => { setActiveTab('support'); setSidebarOpen(false); }}>
                    <LifeBuoy size={20} /> Support
                </button>
            </nav>
            <div className={styles.sidebarFooter}>
                <button onClick={handleLogout} className={styles.logoutBtn}><LogOut size={18} /> Logout</button>
            </div>
        </aside>
    );

    // Skeleton Loader Component
    const TableSkeleton = ({ cols }) => (
        <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                    {Array.from({ length: cols }).map((_, idx) => (
                        <td key={idx}>
                            <div style={{ height: '20px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
                        </td>
                    ))}
                </tr>
            ))}
            <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }`}</style>
        </tbody>
    );

    // Sorting Header Helper
    const SortableHeader = ({ label, sortKey }) => (
        <th onClick={() => handleSort(sortKey)} style={{ cursor: 'pointer', userSelect: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {label}
                {sortConfig.key === sortKey ? (
                    <span style={{ fontSize: '0.8rem' }}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                ) : <ArrowUpDown size={14} color="#94a3b8" />}
            </div>
        </th>
    );

    return (
        <div className={styles.layout}>
            {renderSidebar()}

            <main className={styles.mainContent}>
                <header className={styles.topHeader}>
                    <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={24} /></button>
                    <h1>
                        {activeTab === 'overview'
                            ? 'Dashboard Overview'
                            : activeTab === 'users'
                                ? 'User Management'
                                : activeTab === 'rides'
                                    ? 'Ride Console'
                                    : activeTab === 'support'
                                        ? 'Support Requests'
                                        : 'Dashboard Overview'}
                    </h1>
                    <div className={styles.headerInfo}>Admin Portal</div>
                </header>

                {/* Stats Row */}
                {activeTab === 'overview' && (
                    <div className={styles.statsGrid}>
                        <StatCard title="Total Revenue" value={`₹${stats.totalRevenue ? stats.totalRevenue.toLocaleString() : '0'}`} icon={IndianRupee} color="green" />
                        <StatCard title="Active Rides" value={stats.activeRides || 0} icon={MapPin} color="blue" />
                        <StatCard title="Total Users" value={stats.totalUsers || 0} icon={Users} color="purple" />
                        <StatCard title="Completed Trips" value={stats.completedRides || 0} icon={CheckCircle} color="emerald" />

                        {/* New Metrics */}
                        <StatCard
                            title="Cancelled Rides"
                            value={stats.cancelledRides || 0}
                            icon={XCircle}
                            color="red"
                        />
                    </div>
                )}

                {/* Charts */}
                {activeTab === 'overview' && !loading && (
                    <div className={styles.chartsGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '2rem', alignItems: 'stretch' }}>

                        {/* 1. Revenue Trends (Insight-Driven & State-Aware) */}
                        <div className={styles.chartSection} style={{ padding: '2rem', borderRadius: '20px', background: 'white', border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '350px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Revenue Trends</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                                        Avg. Daily: <span style={{ fontWeight: 600, color: '#6366f1' }}>₹{Math.round(chartData.reduce((acc, curr) => acc + curr.revenue, 0) / 7 || 0).toLocaleString()}</span>
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1' }}>₹{stats.totalRevenue.toLocaleString()}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total (Last 7 Days)</div>
                                </div>
                            </div>
                            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} dy={10} interval="preserveStartEnd" />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} tickFormatter={(value) => `₹${value}`} padding={{ top: 30 }} />
                                        <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />

                                        {/* Average Reference Line */}
                                        <ReferenceLine y={chartData.reduce((acc, curr) => acc + curr.revenue, 0) / 7} stroke="#cbd5e1" strokeDasharray="3 3" label={{ position: 'right', value: 'Avg', fill: '#94a3b8', fontSize: 10 }} />

                                        {/* Today's Data Annotation (Last Point) */}
                                        <ReferenceLine x={chartData[chartData.length - 1]?.name} stroke="none" label={{ position: 'top', value: 'Today', fill: '#6366f1', fontSize: 10, fontWeight: 700 }} />

                                        <Tooltip content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const currentRevenue = payload[0].value;
                                                const index = chartData.findIndex(d => d.name === label);
                                                const prevRevenue = index > 0 ? chartData[index - 1].revenue : 0;
                                                const pctChange = prevRevenue ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

                                                return (
                                                    <div style={{ background: 'rgba(255, 255, 255, 0.98)', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                                                        <p style={{ fontWeight: 700, color: '#334155', marginBottom: '4px' }}>{label}</p>
                                                        <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#6366f1', margin: 0 }}>₹{currentRevenue.toLocaleString()}</p>
                                                        {currentRevenue === 0 ? (
                                                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 0', fontStyle: 'italic' }}>No completed rides</p>
                                                        ) : (
                                                            index > 0 && <p style={{ fontSize: '0.75rem', color: pctChange >= 0 ? '#10b981' : '#f43f5e', margin: '4px 0 0 0', fontWeight: 600 }}>
                                                                {pctChange >= 0 ? '▲' : '▼'} {Math.abs(pctChange).toFixed(1)}% vs prev day
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#6366f1"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorRevenue)"
                                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3, fill: '#6366f1' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. User Distribution (Adaptive Layout) */}
                        <div className={styles.chartSection} style={{ padding: '2rem', borderRadius: '20px', background: 'white', border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '350px' }}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>User Distribution</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                                        Drivers vs Passengers • <span style={{ fontWeight: 600, color: '#334155' }}>{users.length} Total Users</span>
                                    </p>
                                </div>
                            </div>
                            <div style={{ flex: 1, width: '100%', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {users.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                                        <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                        <p>No users registered yet.</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={0}
                                                outerRadius={users.length < 10 ? 80 : 90}
                                                paddingAngle={users.length < 10 ? 0 : 4}
                                                dataKey="value"
                                                stroke="white"
                                                strokeWidth={2}
                                                cornerRadius={4}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.name === 'Drivers' ? '#8b5cf6' : '#06b6d4'} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const { name, value } = payload[0];
                                                    const total = pieData.reduce((a, b) => a + b.value, 0);
                                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                                    return (
                                                        <div style={{ background: 'rgba(255, 255, 255, 0.98)', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: name === 'Drivers' ? '#8b5cf6' : '#06b6d4' }}></div>
                                                                <span style={{ fontWeight: 700, color: '#334155' }}>{name}</span>
                                                            </div>
                                                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>{value} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>users</span></div>
                                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{percentage}% of total</div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }} />
                                            <Legend
                                                verticalAlign="bottom"
                                                align="center"
                                                iconType="circle"
                                                iconSize={8}
                                                wrapperStyle={{ paddingTop: '10px' }}
                                                formatter={(value) => <span style={{ color: '#64748b', fontWeight: 500, fontSize: '0.85rem', marginLeft: '4px' }}>{value}</span>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* 3. Ride Status (Professional Summary) */}
                        <div className={styles.chartSection} style={{ padding: '2rem', borderRadius: '20px', background: 'white', border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
                            {(() => {
                                const activeCount = barData.find(b => b.name === 'Active')?.value || 0;
                                const completedCount = barData.find(b => b.name === 'Completed')?.value || 0;
                                const cancelledCount = barData.find(b => b.name === 'Cancelled')?.value || 0;
                                const totalFinished = completedCount + cancelledCount;
                                const totalRides = activeCount + totalFinished;
                                const completionRate = totalRides > 0 ? ((completedCount / totalRides) * 100).toFixed(0) : 0;

                                return (
                                    <>
                                        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Ride Status</h3>
                                                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Current trip activity</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                {/* Only show badge if we have finished rides */}
                                                {totalFinished > 0 && (
                                                    <div style={{ fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '6px 12px', borderRadius: '8px', fontSize: '0.9rem' }}>{completionRate}% Completion Rate</div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ width: '100%', minHeight: 160, display: 'flex', alignItems: 'center' }}>
                                            {totalFinished === 0 ? (
                                                /* Early Data State: Plain Text Metrics */
                                                <div style={{ width: '100%', textAlign: 'left' }}>
                                                    <div style={{ display: 'flex', gap: '3rem', marginBottom: '1.5rem' }}>
                                                        <div>
                                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1' }}>{activeCount}</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Active</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#94a3b8' }}>{completedCount}</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Completed</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#94a3b8' }}>{cancelledCount}</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Cancelled</div>
                                                        </div>
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                                        Completion metrics will appear once trips finish.
                                                    </p>
                                                </div>
                                            ) : (
                                                /* Mature Data: Chart */
                                                <div style={{ width: '100%', height: 160 }}>
                                                    <ResponsiveContainer>
                                                        <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 60, bottom: 20 }}>
                                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#f1f5f9" />
                                                            <XAxis type="number" hide />
                                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#475569', fontWeight: 600 }} width={100} />
                                                            <Tooltip cursor={{ fill: '#f8fafc', radius: 4 }} content={({ active, payload }) => {
                                                                if (active && payload && payload.length) {
                                                                    const { name, value, fill } = payload[0];
                                                                    const pct = totalRides > 0 ? ((value / totalRides) * 100).toFixed(1) : 0;
                                                                    return (
                                                                        <div style={{ background: 'rgba(255, 255, 255, 0.98)', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                                                            <div style={{ fontWeight: 700, color: fill, marginBottom: '4px' }}>{name}</div>
                                                                            <div style={{ color: '#1e293b', fontWeight: 600 }}>{value} rides ({pct}%)</div>
                                                                        </div>
                                                                    )
                                                                }
                                                                return null;
                                                            }} />
                                                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24} background={{ fill: '#f8fafc', radius: [0, 6, 6, 0] }}>
                                                                {barData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.name === 'Completed' ? '#10b981' : entry.name === 'Active' ? '#6366f1' : '#f43f5e'} />
                                                                ))}
                                                                <LabelList dataKey="value" position="right" formatter={(val) => {
                                                                    const pct = totalRides > 0 ? Math.round((val / totalRides) * 100) : 0;
                                                                    return val > 0 ? `${val} (${pct}%)` : '';
                                                                }} style={{ fontSize: '12px', fontWeight: 600, fill: '#64748b' }} />
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                <div className={styles.contentArea}>
                    {/* Toolbar (Search & Filter) - Only for User/Ride tabs */}
                    {(activeTab === 'users' || activeTab === 'rides') && (
                        <div className={styles.toolbar} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                <input
                                    type="text"
                                    placeholder={`Search ${activeTab}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                                />
                            </div>
                            <div style={{ position: 'relative', minWidth: '150px' }}>
                                <Filter size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', appearance: 'none', backgroundColor: 'white' }}
                                >
                                    <option value="ALL">All Status</option>
                                    {activeTab === 'users' ? (
                                        <>
                                            <option value="DRIVER">Drivers</option>
                                            <option value="PASSENGER">Passengers</option>
                                            <option value="PENDING">Pending Verification</option>
                                            <option value="BLOCKED">Blocked</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="AVAILABLE">Available</option>
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="COMPLETED">Completed</option>
                                            <option value="CANCELLED">Cancelled</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        </div>
                    )}



                    {activeTab === 'support' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className={styles.toolbar} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ minWidth: '180px' }}>
                                    <select
                                        value={supportStatusFilter}
                                        onChange={(e) => {
                                            setSupportStatusFilter(e.target.value);
                                            setSupportPage(0);
                                        }}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', backgroundColor: 'white' }}
                                    >
                                        <option value="">All Status</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="IN_REVIEW">In Review</option>
                                        <option value="RESOLVED">Resolved</option>
                                    </select>
                                </div>
                                <Button variant="outline" onClick={fetchSupportRequests}>Refresh</Button>
                            </div>

                            <div className={styles.tableContainer}>
                                {supportLoading ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading support requests...</div>
                                ) : supportData.items.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No support requests found.</div>
                                ) : (
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Booking</th>
                                                <th>Passenger</th>
                                                <th>Driver</th>
                                                <th>Issue</th>
                                                <th>Refund</th>
                                                <th>Evidence</th>
                                                <th>Status</th>
                                                <th>Updated</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {supportData.items.map((request) => (
                                                <tr key={request.id}>
                                                    <td>#{String(request.id).padStart(4, '0')}</td>
                                                    <td>#{request.bookingId}</td>
                                                    <td>{request.passengerName || request.passenger?.name || 'N/A'}</td>
                                                    <td>{request.driverName || request.driver?.name || 'N/A'}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <span style={{ fontWeight: 600 }}>{request.issueDescription}</span>
                                                            <small style={{ color: '#64748b' }}>{request.rideSource} to {request.rideDestination}</small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {request.refundRequested ? (
                                                            <span style={{ color: '#dc2626', fontWeight: 600 }}>Requested</span>
                                                        ) : (
                                                            <span style={{ color: '#64748b' }}>No</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {Array.isArray(request.evidenceUrls) && request.evidenceUrls.length > 0 ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                {request.evidenceUrls.map((url, idx) => (
                                                                    <a key={`${request.id}-evidence-${idx}`} href={url} target="_blank" rel="noreferrer" style={{ color: '#0f4c81' }}>
                                                                        Evidence {idx + 1}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#94a3b8' }}>None</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={`${styles.statusBadge} ${styles[request.status] || ''}`}>{request.status}</span>
                                                    </td>
                                                    <td>{request.updatedAt ? new Date(request.updatedAt).toLocaleDateString('en-GB') : 'N/A'}</td>
                                                    <td>
                                                        <Button size="sm" onClick={() => openSupportDecision(request.id, request.status)}>Update</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {supportData.totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        Page {supportPage + 1} of {supportData.totalPages}
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <button
                                            disabled={supportPage === 0}
                                            onClick={() => setSupportPage((p) => Math.max(p - 1, 0))}
                                            style={{ background: 'none', border: 'none', cursor: supportPage === 0 ? 'not-allowed' : 'pointer', padding: 0, display: 'flex', alignItems: 'center', opacity: supportPage === 0 ? 0.3 : 1 }}
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{supportPage + 1}</span>
                                        <button
                                            disabled={supportPage >= supportData.totalPages - 1}
                                            onClick={() => setSupportPage((p) => Math.min(p + 1, supportData.totalPages - 1))}
                                            style={{ background: 'none', border: 'none', cursor: supportPage >= supportData.totalPages - 1 ? 'not-allowed' : 'pointer', padding: 0, display: 'flex', alignItems: 'center', opacity: supportPage >= supportData.totalPages - 1 ? 0.3 : 1 }}
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Users Table */}
                    {(activeTab === 'users' || activeTab === 'overview') && (
                        <div className={styles.sectionCard}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}>{activeTab === 'overview' ? 'Recent Users' : 'User List'}</h2>
                                {activeTab === 'overview' && <Button size="sm" variant="outline" onClick={() => setActiveTab('users')}>View All</Button>}
                            </div>
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            {activeTab === 'users' && <th style={{ width: '40px' }}></th>}
                                            <SortableHeader label="ID" sortKey="id" />
                                            <SortableHeader label="Name" sortKey="name" />
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem' }}>Phone</th>
                                            <SortableHeader label="Role" sortKey="role" />

                                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem' }}>Status</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem' }}>Action</th>
                                        </tr>
                                    </thead>
                                    {loading ? <TableSkeleton cols={activeTab === 'users' ? 7 : 6} /> : (
                                        <tbody>
                                            {(activeTab === 'overview' ? recentUsers : paginatedData).map(u => {
                                                const isVerified = u.isVerified !== undefined ? u.isVerified : (u.verified !== undefined ? u.verified : false);
                                                const isActive = u.isActive !== undefined ? u.isActive : (u.active !== undefined ? u.active : true);
                                                const isExpanded = expandedUserId === u.id;
                                                const isAdmin = u.role === 'ADMIN';
                                                // Format Member Since date
                                                const memberSince = u.memberSince || (u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : null);
                                                
                                                // Calculate actual counts from loaded data
                                                const totalRidesPosted = rides.filter(r => r.driver?.id === u.id).length;
                                                const totalBookingsMade = bookings.filter(b => b.passenger?.id === u.id).length;

                                                return (
                                                    <React.Fragment key={u.id}>
                                                        <tr style={{ cursor: activeTab === 'users' && !isAdmin ? 'pointer' : 'default', backgroundColor: isExpanded ? '#f8fafc' : 'transparent' }} onClick={() => activeTab === 'users' && !isAdmin && toggleUserDetails(u.id)}>
                                                            {activeTab === 'users' && (
                                                                <td style={{ textAlign: 'center' }}>
                                                                    {!isAdmin && (isExpanded ? <ChevronUp size={18} color="#6366f1" /> : <ChevronDown size={18} color="#94a3b8" />)}
                                                                </td>
                                                            )}
                                                            <td>{String(u.id).padStart(3, '0')}</td>
                                                            <td><div className={styles.userName}>{u.name}</div><small className={styles.userEmail}>{u.email}</small></td>
                                                            <td style={{ color: '#64748b', fontSize: '0.9rem' }}>{u.phone || 'N/A'}</td>
                                                            <td><span className={styles.roleBadge}>{u.role}</span></td>

                                                            <td>
                                                                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                                    {u.role === 'DRIVER' && (isVerified ? <span className={styles.verified}>Verified</span> : <span className={styles.pending}>Pending</span>)}
                                                                    {!isActive ? <span className={styles.blocked}>Blocked</span> : <span className={styles.activeStatus}>Active</span>}
                                                                </div>
                                                            </td>
                                                            <td onClick={(e) => e.stopPropagation()}>
                                                                <div className={styles.tableActions}>
                                                                    {u.role === 'DRIVER' && !isVerified && <Button size="sm" onClick={() => handleVerify(u.id)} className={styles.actionBtn}>Verify</Button>}
                                                                    {isActive && u.role !== 'ADMIN' && <Button size="sm" variant="outline" onClick={() => handleBlock(u.id)} className={styles.btnDanger}>Block</Button>}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        
                                                        {/* Expanded Row: User Details */}
                                                        {isExpanded && activeTab === 'users' && !isAdmin && (
                                                            <tr>
                                                                <td colSpan="7" style={{ padding: 0, backgroundColor: '#f8fafc', borderTop: 'none' }}>
                                                                    <div style={{ padding: '1.5rem', borderLeft: '3px solid #6366f1' }}>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                                                            {/* Basic Information */}
                                                                            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                    <User size={16} /> Basic Information
                                                                                </h4>
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                                                                                    <div>
                                                                                        <span style={{ color: '#64748b', fontWeight: 500 }}>Full Name:</span>
                                                                                        <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>{u.name}</div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span style={{ color: '#64748b', fontWeight: 500 }}>Email:</span>
                                                                                        <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                            {u.email}
                                                                                            {u.emailVerified ? <CheckCircle size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span style={{ color: '#64748b', fontWeight: 500 }}>Phone:</span>
                                                                                        <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>{u.phone || 'Not provided'}</div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span style={{ color: '#64748b', fontWeight: 500 }}>Role:</span>
                                                                                        <div style={{ marginTop: '4px' }}><span className={styles.roleBadge}>{u.role}</span></div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            {/* Account Status */}
                                                                            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                    <ShieldCheck size={16} /> Account Status
                                                                                </h4>
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                        <span style={{ color: '#64748b', fontWeight: 500 }}>Account Active:</span>
                                                                                        <span style={{ fontWeight: 600, color: isActive ? '#10b981' : '#ef4444' }}>
                                                                                            {isActive ? 'Yes' : 'Blocked'}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                        <span style={{ color: '#64748b', fontWeight: 500 }}>Email Verified:</span>
                                                                                        <span style={{ fontWeight: 600, color: u.emailVerified ? '#10b981' : '#ef4444' }}>
                                                                                            {u.emailVerified ? 'Yes' : 'No'}
                                                                                        </span>
                                                                                    </div>
                                                                                    {u.role === 'DRIVER' && (
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                            <span style={{ color: '#64748b', fontWeight: 500 }}>Driver Verified:</span>
                                                                                            <span style={{ fontWeight: 600, color: isVerified ? '#10b981' : '#f59e0b' }}>
                                                                                                {isVerified ? 'Yes' : 'Pending'}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                    <div>
                                                                                        <span style={{ color: '#64748b', fontWeight: 500 }}>Member Since:</span>
                                                                                        <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                                                                                            {memberSince || 'N/A'}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            {/* Driver Specific Info */}
                                                                            {u.role === 'DRIVER' && (
                                                                                <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                        <Car size={16} /> Driver Information
                                                                                    </h4>
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                                                                                        <div>
                                                                                            <span style={{ color: '#64748b', fontWeight: 500 }}>Vehicle Model:</span>
                                                                                            <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>{u.vehicleModel || 'Not provided'}</div>
                                                                                        </div>
                                                                                        <div>
                                                                                            <span style={{ color: '#64748b', fontWeight: 500 }}>License Plate:</span>
                                                                                            <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>{u.licensePlate || 'Not provided'}</div>
                                                                                        </div>
                                                                                        <div>
                                                                                            <span style={{ color: '#64748b', fontWeight: 500 }}>Average Rating:</span>
                                                                                            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                                <Star size={14} fill="#ffc107" color="#ffc107" />
                                                                                                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                                                                                    {u.averageRating ? u.averageRating.toFixed(1) : 'N/A'} {u.totalReviews ? `(${u.totalReviews} reviews)` : ''}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            
                                                                            {/* Additional Info */}
                                                                            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                    <Activity size={16} /> Activity
                                                                                </h4>
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                                                                                    {u.role === 'DRIVER' && (
                                                                                        <div>
                                                                                            <span style={{ color: '#64748b', fontWeight: 500 }}>Total Rides Posted:</span>
                                                                                            <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>{totalRidesPosted}</div>
                                                                                        </div>
                                                                                    )}
                                                                                    {u.role === 'PASSENGER' && (
                                                                                        <div>
                                                                                            <span style={{ color: '#64748b', fontWeight: 500 }}>Total Bookings:</span>
                                                                                            <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>{totalBookingsMade}</div>
                                                                                        </div>
                                                                                    )}
                                                                                    <div>
                                                                                        <span style={{ color: '#64748b', fontWeight: 500 }}>Bio:</span>
                                                                                        <div style={{ fontWeight: 500, color: '#64748b', marginTop: '2px', fontStyle: u.bio ? 'normal' : 'italic' }}>
                                                                                            {u.bio || 'No bio provided'}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                            {!loading && (activeTab === 'overview' ? recentUsers : paginatedData).length === 0 && (
                                                <tr><td colSpan={activeTab === 'users' ? '7' : '6'} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No users found matching filters.</td></tr>
                                            )}
                                        </tbody>
                                    )}  </table>
                            </div>

                            {/* Pagination Controls */}
                            {activeTab === 'users' && !loading && processedData.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, processedData.length)} to {Math.min(currentPage * ITEMS_PER_PAGE, processedData.length)} of {processedData.length} results
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ background: 'none', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', padding: 0, display: 'flex', alignItems: 'center', opacity: currentPage === 1 ? 0.3 : 1 }}><ChevronLeft size={16} /></button>
                                        <span style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '0.9rem', fontWeight: '600' }}>{currentPage}</span>
                                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ background: 'none', border: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', padding: 0, display: 'flex', alignItems: 'center', opacity: currentPage === totalPages ? 0.3 : 1 }}><ChevronRight size={16} /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Rides Table */}
                    {(activeTab === 'rides' || activeTab === 'overview') && (
                        <div className={styles.sectionCard}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}>{activeTab === 'overview' ? 'Recent Rides' : 'Ride Console'}</h2>
                                {activeTab === 'overview' && <Button size="sm" variant="outline" onClick={() => setActiveTab('rides')}>View All</Button>}
                            </div>
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            {activeTab === 'rides' && <th style={{ width: '40px' }}></th>}
                                            <SortableHeader label="ID" sortKey="id" />
                                            <SortableHeader label="Driver" sortKey="driver.name" />
                                            <SortableHeader label="Route" sortKey="source" />
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem' }}>Price</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem' }}>Bookings</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem' }}>Status</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    {loading ? <TableSkeleton cols={activeTab === 'rides' ? 8 : 7} /> : (
                                        <tbody>
                                            {(activeTab === 'overview' ? recentRides : paginatedData).map(r => {
                                                const isExpanded = expandedRideId === r.id;
                                                const bookings = rideBookings[r.id] || [];
                                                // Only count seats from active bookings (not cancelled)
                                                const activeBookings = bookings.filter(b => b.status !== 'CANCELLED' && b.status !== 'CANCELLED_BY_DRIVER' && b.status !== 'CANCELLED_BY_ADMIN');
                                                const totalBookedSeats = activeBookings.reduce((sum, b) => sum + (b.seatsBooked || 0), 0);
                                                // Calculate total original seats: availableSeats (current) + bookedSeats
                                                const totalSeats = r.availableSeats + totalBookedSeats;
                                                // Calculate revenue: include all non-cancelled bookings
                                                const revenue = activeBookings.reduce((sum, b) => {
                                                    const amount = b.payment?.amount || (r.pricePerSeat * (b.seatsBooked || 0) * 1.07);
                                                    return sum + amount;
                                                }, 0);
                                                
                                                return (
                                                    <React.Fragment key={r.id}>
                                                        <tr style={{ cursor: activeTab === 'rides' ? 'pointer' : 'default', backgroundColor: isExpanded ? '#f8fafc' : 'transparent' }} onClick={() => activeTab === 'rides' && toggleRideDetails(r.id)}>
                                                            {activeTab === 'rides' && (
                                                                <td style={{ textAlign: 'center' }}>
                                                                    {isExpanded ? <ChevronUp size={18} color="#6366f1" /> : <ChevronDown size={18} color="#94a3b8" />}
                                                                </td>
                                                            )}
                                                            <td>{String(r.id).padStart(3, '0')}</td>
                                                            <td>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontWeight: 600 }}>{r.driver?.name}</span>
                                                                    <small style={{ color: '#64748b', fontSize: '0.8rem' }}>{r.driver?.phone}</small>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                    <span style={{ fontWeight: 500 }}>{r.source}</span>
                                                                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>→ {r.destination}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ fontWeight: 600, color: '#10b981' }}>₹{r.pricePerSeat}</td>
                                                            <td>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontWeight: 600 }}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</span>
                                                                    <small style={{ color: '#64748b', fontSize: '0.8rem' }}>{totalBookedSeats}/{totalSeats} seats</small>
                                                                </div>
                                                            </td>
                                                            <td><span className={`${styles.statusBadge} ${styles[r.status]}`}>{r.status}</span></td>
                                                            <td onClick={(e) => e.stopPropagation()}>
                                                                {r.status !== 'CANCELLED' && r.status !== 'CANCELLED_BY_ADMIN' && (
                                                                    <Button size="sm" variant="outline" onClick={() => openCancelModal(r.id)} className={styles.btnDanger}>Cancel</Button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        
                                                        {/* Expanded Row: Customer Details */}
                                                        {isExpanded && activeTab === 'rides' && (
                                                            <tr>
                                                                <td colSpan="8" style={{ padding: 0, backgroundColor: '#f8fafc', borderTop: 'none' }}>
                                                                    <div style={{ padding: '1.5rem', borderLeft: '3px solid #6366f1' }}>
                                                                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                                                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                                                                                <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                                                                Customers & Bookings ({bookings.length} total{bookings.filter(b => b.status === 'CANCELLED' || b.status === 'CANCELLED_BY_DRIVER' || b.status === 'CANCELLED_BY_ADMIN').length > 0 ? `, ${bookings.filter(b => b.status !== 'CANCELLED' && b.status !== 'CANCELLED_BY_DRIVER' && b.status !== 'CANCELLED_BY_ADMIN').length} active` : ''})
                                                                            </h4>
                                                                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                                                                                <div>
                                                                                    <span style={{ color: '#64748b' }}>Total Revenue: </span>
                                                                                    <span style={{ fontWeight: 700, color: '#10b981' }}>₹{revenue.toFixed(2)}</span>
                                                                                </div>
                                                                                <div>
                                                                                    <span style={{ color: '#64748b' }}>Active Passengers: </span>
                                                                                    <span style={{ fontWeight: 700, color: '#6366f1' }}>{totalBookedSeats}</span>
                                                                                </div>
                                                                                <div>
                                                                                    <span style={{ color: '#64748b' }}>Available Seats: </span>
                                                                                    <span style={{ fontWeight: 700, color: '#0ea5e9' }}>{r.availableSeats}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {loadingBookings ? (
                                                                            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                                                                Loading customer details...
                                                                            </div>
                                                                        ) : bookings.length === 0 ? (
                                                                            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                                                                <UserCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                                                                <p>No bookings for this ride yet.</p>
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                                                                                {bookings.map((booking, idx) => {
                                                                                    const isCancelled = booking.status === 'CANCELLED' || booking.status === 'CANCELLED_BY_DRIVER' || booking.status === 'CANCELLED_BY_ADMIN';
                                                                                    return (
                                                                                    <div key={idx} style={{ 
                                                                                        padding: '1rem', 
                                                                                        backgroundColor: isCancelled ? '#fef2f2' : 'white', 
                                                                                        borderRadius: '12px', 
                                                                                        border: isCancelled ? '1px solid #fecaca' : '1px solid #e2e8f0',
                                                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                                                                        opacity: isCancelled ? 0.75 : 1
                                                                                    }}>
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                                <UserCircle size={24} color={isCancelled ? '#ef4444' : '#6366f1'} />
                                                                                                <div>
                                                                                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{booking.passenger?.name || 'N/A'}</div>
                                                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Booking #{String(booking.id).padStart(3, '0')}</div>
                                                                                                </div>
                                                                                            </div>
                                                                                            <span className={`${styles.statusBadge} ${styles[booking.status]}`} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                                                                                                {booking.status}
                                                                                            </span>
                                                                                        </div>
                                                                                        
                                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                                                                                                <Mail size={14} />
                                                                                                <span>{booking.passenger?.email || 'N/A'}</span>
                                                                                            </div>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                                                                                                <Phone size={14} />
                                                                                                <span>{booking.passenger?.phone || 'N/A'}</span>
                                                                                            </div>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isCancelled ? '#ef4444' : '#64748b' }}>
                                                                                                <Users size={14} />
                                                                                                <span>{booking.seatsBooked || 0} seat{booking.seatsBooked !== 1 ? 's' : ''} {isCancelled ? '(freed)' : 'booked'}</span>
                                                                                            </div>
                                                                                            {booking.payment && (
                                                                                                <div style={{ 
                                                                                                    marginTop: '0.5rem', 
                                                                                                    paddingTop: '0.5rem', 
                                                                                                    borderTop: '1px solid #f1f5f9',
                                                                                                    display: 'flex',
                                                                                                    justifyContent: 'space-between',
                                                                                                    alignItems: 'center'
                                                                                                }}>
                                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                                        <CreditCard size={14} color={booking.payment.status === 'COMPLETED' ? '#10b981' : isCancelled ? '#ef4444' : '#f59e0b'} />
                                                                                                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{isCancelled ? 'Cancelled' : 'Payment'}</span>
                                                                                                    </div>
                                                                                                    <span style={{ 
                                                                                                        fontWeight: 700, 
                                                                                                        color: booking.payment.status === 'COMPLETED' ? '#10b981' : isCancelled ? '#ef4444' : '#f59e0b',
                                                                                                        textDecoration: isCancelled ? 'line-through' : 'none'
                                                                                                    }}>
                                                                                                        ₹{booking.payment.amount}
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                            {!loading && (activeTab === 'overview' ? recentRides : paginatedData).length === 0 && (
                                                <tr><td colSpan={activeTab === 'rides' ? '8' : '7'} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No rides found matching filters.</td></tr>
                                            )}
                                        </tbody>
                                    )}
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {activeTab === 'rides' && !loading && processedData.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, processedData.length)} to {Math.min(currentPage * ITEMS_PER_PAGE, processedData.length)} of {processedData.length} results
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ background: 'none', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', padding: 0, display: 'flex', alignItems: 'center', opacity: currentPage === 1 ? 0.3 : 1 }}><ChevronLeft size={16} /></button>
                                        <span style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '0.9rem', fontWeight: '600' }}>{currentPage}</span>
                                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ background: 'none', border: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', padding: 0, display: 'flex', alignItems: 'center', opacity: currentPage === totalPages ? 0.3 : 1 }}><ChevronRight size={16} /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main >

            {/* Cancel Modal */}
            {
                cancelModal.show && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h3>Cancel Ride</h3>
                            <p>Please provide a reason for cancellation.</p>
                            <textarea className={styles.textarea} value={cancelModal.reason} onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })} />
                            <div className={styles.modalActions}>
                                <Button variant="outline" onClick={() => setCancelModal({ show: false, rideId: null, reason: '' })}>Close</Button>
                                <Button onClick={submitCancel} className={styles.btnDanger} style={{ color: 'white', background: '#dc2626' }}>Confirm</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Support Decision Modal */}
            {supportDecisionModal.show && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3>Update Support Request</h3>
                        <p>Set the status and add optional admin notes.</p>
                        <select
                            className={styles.selectInput}
                            value={supportDecisionModal.status}
                            onChange={(e) => setSupportDecisionModal(prev => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="PENDING">Pending</option>
                            <option value="IN_REVIEW">In Review</option>
                            <option value="RESOLVED">Resolved</option>
                        </select>
                        <textarea
                            className={styles.textarea}
                            value={supportDecisionModal.notes}
                            onChange={(e) => setSupportDecisionModal(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Admin notes (optional)"
                        />
                        <div className={styles.modalActions}>
                            <Button variant="outline" onClick={() => setSupportDecisionModal({ show: false, id: null, status: 'IN_REVIEW', notes: '' })}>Close</Button>
                            <Button onClick={submitSupportDecision} style={{ color: 'white', background: '#0f4c81' }}>
                                Update
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.show}
                onClose={() => setConfirmModal({ ...confirmModal, show: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText="Confirm"
                cancelText="Cancel"
            />

            {/* Toast Notifications */}
            <LocalToast toasts={toasts} onRemove={removeToast} />
        </div >
    );
};

export default AdminDashboard;
