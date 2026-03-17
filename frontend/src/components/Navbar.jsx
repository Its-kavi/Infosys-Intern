import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';
import LocalToast from './LocalToast';
import { useToast } from '../utils/useToast';
import { User, LogOut, LayoutDashboard, Ticket, Bell } from 'lucide-react';
import styles from './Navbar.module.css';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadNotificationCount } from '../services/api';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const { toasts, showToast, removeToast } = useToast();

    // Fetch unread count on mount and when user changes
    useEffect(() => {
        if (user) {
            fetchUnreadCount();
        }
    }, [user]);

    useEffect(() => {
        if (!user) return undefined;

        const intervalId = setInterval(() => {
            fetchUnreadCount();
        }, 60000);

        return () => clearInterval(intervalId);
    }, [user]);

    // Listen for real-time unread count updates from WebSocket
    useEffect(() => {
        const handleNotificationCountUpdate = (event) => {
            if (event.detail && event.detail.unreadCount !== undefined) {
                setUnreadCount(event.detail.unreadCount);
            }
        };

        window.addEventListener('notification-count-update', handleNotificationCountUpdate);
        
        return () => {
            window.removeEventListener('notification-count-update', handleNotificationCountUpdate);
        };
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const count = await getUnreadNotificationCount();
            setUnreadCount(count);
        } catch (error) {
            console.error("Failed to fetch unread count:", error);
            if (error.message?.includes('Access denied')) {
                setUnreadCount(0);
            }
        }
    };

    const fetchNotifications = async () => {
        setLoadingNotifications(true);
        try {
            const data = await getNotifications();
            setNotifications(data || []);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
            if (error.message?.includes('Access denied')) {
                setNotifications([]);
            }
        } finally {
            setLoadingNotifications(false);
        }
    };

    // Fetch notifications when dropdown is opened
    const handleNotificationToggle = () => {
        const willShow = !showNotifications;
        setShowNotifications(willShow);
        if (willShow && notifications.length === 0) {
            fetchNotifications();
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await markNotificationAsRead(notificationId);
            setNotifications(prev => 
                prev.map(notif => 
                    notif.id === notificationId ? { ...notif, read: true } : notif
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead();
            setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
        }
    };

    const formatNotificationTime = (timestamp) => {
        try {
            // Handle different date formats from backend
            let date;
            if (Array.isArray(timestamp)) {
                // Java LocalDateTime format: [year, month, day, hour, minute, second, nano]
                const [year, month, day, hour, minute] = timestamp;
                date = new Date(year, month - 1, day, hour, minute);
            } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
                date = new Date(timestamp);
            } else {
                date = new Date(timestamp);
            }

            if (isNaN(date.getTime())) {
                return 'Just now';
            }

            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Just now';
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const isVerified = user?.isVerified === true;

    const handlePublishRideClick = (e) => {
        if (!isVerified) {
            e.preventDefault();
            showToast(
                "Your account needs to be verified by an admin before you can publish rides. If you were recently verified, please logout and login again to refresh your status.",
                "WARNING",
                "Verification Required"
            );
        }
    };

    const handleAboutClick = (e) => {
        e.preventDefault();
        if (location.pathname === '/') {
            const element = document.getElementById('about');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            navigate('/', { state: { scrollTo: 'about' } });
        }
    };

    return (
        <nav className={styles.navbar}>
            <LocalToast toasts={toasts} onRemove={removeToast} />
            <div className={`container ${styles.navContainer}`}>
                <Link to="/" className={styles.logo}>
                    RideConnect
                </Link>

                <div className={styles.navLinks}>
                    {location.pathname !== '/login' && location.pathname !== '/register' && (
                        <>
                            {!user && <a href="#about" onClick={handleAboutClick} className={styles.navLink}>About Us</a>}

                            {user?.role === 'PASSENGER' && (
                                <Link to="/passenger-dashboard">
                                    <Button size="sm" variant="outline">Find a Ride</Button>
                                </Link>
                            )}

                            {user?.role === 'DRIVER' && (
                                <>
                                    {isVerified ? (
                                        <Link to="/post-ride">
                                            <Button size="sm" variant="outline">Publish a Ride</Button>
                                        </Link>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled
                                            onClick={handlePublishRideClick}
                                            style={{ cursor: 'not-allowed' }}
                                        >
                                            Publish a Ride
                                        </Button>
                                    )}
                                </>
                            )}

                            {user?.role === 'ADMIN' && (
                                <Link to="/admin-dashboard">
                                    <Button size="sm" variant="outline">Admin Dashboard</Button>
                                </Link>
                            )}
                        </>
                    )}

                    {user ? (
                        <div className={styles.profileContainer}>
                            {/* Notification Bell */}
                            <div className={styles.notificationContainer}>
                                <button
                                    className={styles.notificationBtn}
                                    onClick={handleNotificationToggle}
                                >
                                    <Bell size={20} />
                                    {unreadCount > 0 && (
                                        <span className={styles.notificationBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                                    )}
                                </button>

                                {showNotifications && (
                                    <div className={styles.notificationDropdown}>
                                        <div className={styles.notificationHeader}>
                                            <h3>Notifications</h3>
                                            {unreadCount > 0 && (
                                                <button 
                                                    onClick={handleMarkAllAsRead}
                                                    className={styles.markAllBtn}
                                                >
                                                    Mark all as read
                                                </button>
                                            )}
                                        </div>

                                        <div className={styles.notificationList}>
                                            {loadingNotifications ? (
                                                <div className={styles.notificationEmpty}>Loading...</div>
                                            ) : notifications.length === 0 ? (
                                                <div className={styles.notificationEmpty}>No notifications</div>
                                            ) : (
                                                notifications.map((notification) => (
                                                    <div 
                                                        key={notification.id} 
                                                        className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                                                        onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                                                    >
                                                        <div className={styles.notificationContent}>
                                                            <div className={styles.notificationTitle}>
                                                                {notification.title}
                                                            </div>
                                                            <div className={styles.notificationMessage}>
                                                                {notification.message}
                                                            </div>
                                                            <div className={styles.notificationTime}>
                                                                {formatNotificationTime(notification.timestamp)}
                                                            </div>
                                                        </div>
                                                        {!notification.read && (
                                                            <div className={styles.unreadDot}></div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                className={styles.profileBtn}
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                            >
                                <div className={styles.avatar}>
                                    <User size={20} />
                                </div>
                            </button>

                            {showProfileMenu && (
                                <div className={styles.dropdown}>
                                    <div className={styles.dropdownHeader}>
                                        <p className={styles.userRole}>{user.name || user.role}</p>
                                        <p className={styles.userEmail}>{user.email}</p>
                                    </div>


                                    <Link to="/profile" className={styles.dropdownItem} onClick={() => setShowProfileMenu(false)}>
                                        <User size={16} />Edit Profile
                                    </Link>

                                    {user.role === 'PASSENGER' && (
                                        <Link to="/my-bookings" className={styles.dropdownItem} onClick={() => setShowProfileMenu(false)}>
                                            <Ticket size={16} /> My Bookings
                                        </Link>
                                    )}

                                    {user.role === 'DRIVER' && (
                                        <Link to="/driver-dashboard" className={styles.dropdownItem} onClick={() => setShowProfileMenu(false)}>
                                            <LayoutDashboard size={16} /> My Rides
                                        </Link>
                                    )}

                                    <button onClick={handleLogout} className={`${styles.dropdownItem} ${styles.logoutItem}`}>
                                        <LogOut size={16} /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <Link to="/login" className={styles.navLink}>Login</Link>
                            <Link to="/register">
                                <Button size="sm" className={styles.signupBtn}>Sign Up</Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
