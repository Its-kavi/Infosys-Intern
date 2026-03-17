import React, { useState, useEffect, useRef, useMemo } from 'react';

import Navbar from '../../components/Navbar';
import Button from '../../components/ui/Button';
import LocalToast from '../../components/LocalToast';
import QuickBookCard from '../../components/passenger/QuickBookCard';
import LiveTrackingCard from '../../components/passenger/LiveTrackingCard';
import InteractiveMap from '../../components/maps/InteractiveMap';
import UserProfileModal from '../../components/UserProfileModal';
import ReviewModal from '../../components/ReviewModal';
import { searchRides, bookRide, getRecentRoutes, getActiveRide, getMyBookings } from '../../services/api';
import { useToast } from '../../utils/useToast.js';
import styles from './PassengerDashboard.module.css';
import { Search, MapPin, Calendar, Clock, User, CheckCircle, Filter, Map as MapIcon, Maximize, Minimize, ShieldCheck, Plus, Minus } from 'lucide-react';

const PassengerDashboard = () => {
    // Search State
    const [searchParams, setSearchParams] = useState({
        source: '', destination: '', date: '',
        minPrice: '', maxPrice: '', minSeats: 1
    });

    // Data State
    const [rides, setRides] = useState([]);
    const [recentRoutes, setRecentRoutes] = useState([]);
    const [activeRide, setActiveRide] = useState(null);
    const [history, setHistory] = useState([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [viewProfileId, setViewProfileId] = useState(null);
    const [selectedMapRide, setSelectedMapRide] = useState(null);

    // Interaction State
    const [selectedRide, setSelectedRide] = useState(null);
    const [seatsToBook, setSeatsToBook] = useState(1);
    const [bookingStatus, setBookingStatus] = useState(null);

    const [hasSearched, setHasSearched] = useState(false);

    const [reviewBooking, setReviewBooking] = useState(null);
    const { toasts, showToast, removeToast } = useToast();
    const notificationRefreshTimer = useRef(null);

    // Initial Fetch
    useEffect(() => {
        const loadDashboard = async () => {
            setLoading(true);
            try {
                // 1. Initial Fetch - Don't fetch all rides automatically
                // const ridesData = await searchRides({});
                // setRides(ridesData || []);
                setRides([]); // Start empty

                // 2. Fetch Recent Routes (Optional - may not be implemented yet)
                try {
                    const routesData = await getRecentRoutes();
                    setRecentRoutes(routesData || []);
                } catch (err) {
                    console.log("Recent routes not available:", err.message);
                    setRecentRoutes([]); // Set empty array if endpoint not available
                }

                // 3. Fetch Active Ride (if any)
                try {
                    const activeData = await getActiveRide();
                    setActiveRide(activeData);
                } catch (err) {
                    console.log("No active ride:", err.message);
                    setActiveRide(null);
                }

                // 4. Fetch Ride History (My Bookings)
                try {
                    const historyData = await getMyBookings();
                    setHistory(historyData || []);
                } catch (err) {
                    console.log("History fetch failed:", err);
                }
            } catch (err) {
                console.error("Dashboard Load Error:", err);
            } finally {
                setLoading(false);
            }
        };
        loadDashboard();
    }, []);

    useEffect(() => {
        const handleNotification = () => {
            if (notificationRefreshTimer.current) {
                clearTimeout(notificationRefreshTimer.current);
            }
            notificationRefreshTimer.current = setTimeout(async () => {
                try {
                    const [historyData, activeData] = await Promise.allSettled([
                        getMyBookings(),
                        getActiveRide()
                    ]);

                    if (historyData.status === 'fulfilled') {
                        setHistory(historyData.value || []);
                    }
                    if (activeData.status === 'fulfilled') {
                        setActiveRide(activeData.value);
                    }
                } catch (err) {
                    console.log("Notification refresh failed:", err);
                }
            }, 1000);
        };

        window.addEventListener('notification-received', handleNotification);
        return () => {
            window.removeEventListener('notification-received', handleNotification);
            if (notificationRefreshTimer.current) {
                clearTimeout(notificationRefreshTimer.current);
            }
        };
    }, []);

    const handleSearchChange = (e) => {
        setSearchParams({ ...searchParams, [e.target.name]: e.target.value });
    };

    const performSearch = async (filters) => {
        setLoading(true);
        try {
            const data = await searchRides(filters);

            setRides(data || []);
            setHasSearched(true);
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        performSearch(searchParams);
    };

    const handleQuickBook = (route) => {
        setSearchParams({ ...searchParams, source: route.source, destination: route.destination });
        performSearch({ source: route.source, destination: route.destination });
    };

    const handleViewMap = (ride) => {
        setSelectedMapRide(ride);
    };

    const handleRateDriver = (booking) => {
        setReviewBooking(booking);
    };

    const handleReviewSuccess = () => {
        showToast("Review submitted successfully!", "SUCCESS");
        setReviewBooking(null);
        // Refresh history to potentially update status if needed (though API might not return 'REVIEWED' status yet)
    };

    const confirmBooking = async () => {
        setBookingStatus('loading');
        try {
            await bookRide(selectedRide.id, seatsToBook);
            showToast("Ride booked successfully!", "SUCCESS");
            // Close modal and reset state immediately
            setSelectedRide(null);
            setBookingStatus(null);
            setSeatsToBook(1);
            // Refresh history
            const historyData = await getMyBookings();
            setHistory(historyData || []);
        } catch (error) {
            setBookingStatus('error');
            const errorMessage = error.message || "Booking failed";
            // Check if error is related to email verification
            if (errorMessage.toLowerCase().includes('email') && 
                (errorMessage.toLowerCase().includes('verify') || 
                 errorMessage.toLowerCase().includes('verified') ||
                 errorMessage.toLowerCase().includes('verification'))) {
                showToast("⚠️ Please verify your email before booking rides. Check your inbox for the verification link.", "ERROR");
            } else {
                showToast(errorMessage, "ERROR");
            }
        }
    };

    const handleBookClick = (ride) => {
        const isDuplicate = history.some(booking => booking.ride.id === ride.id && ['PENDING', 'CONFIRMED'].includes(booking.status));
        if (isDuplicate) {
            showToast("You have already booked this ride.", "ERROR");
            return;
        }
        setSelectedRide(ride);
    };

    return (
        <div className={styles.pageWrapper}>
            <Navbar />



            {/* 2. Search Hero */}
            <div className={styles.searchHero}>
                <div className="container">
                    <h1 className={styles.heroTitle}>Find your ride</h1>



                    {/* Search Form */}
                    <div className={styles.searchContainer}>
                        <form onSubmit={handleSearchSubmit}>
                            <div className={styles.searchBar}>
                                <div className={styles.searchInput}>
                                    <MapPin size={18} className={styles.icon} />
                                    <input type="text" name="source" placeholder="Leaving from" value={searchParams.source} onChange={handleSearchChange} />
                                </div>
                                <div className={styles.divider}></div>
                                <div className={styles.searchInput}>
                                    <MapPin size={18} className={styles.icon} />
                                    <input type="text" name="destination" placeholder="Going to" value={searchParams.destination} onChange={handleSearchChange} />
                                </div>
                                <div className={styles.divider}></div>
                                <div className={styles.searchInput}>
                                    <Calendar size={18} className={styles.icon} />
                                    <input type="date" name="date" value={searchParams.date} onChange={handleSearchChange} />
                                </div>
                                <Button type="submit" className={styles.searchBtn}><Search size={20} /> Search</Button>
                            </div>

                            <div className={styles.filterToggle} onClick={() => setShowFilters(!showFilters)}>
                                <Filter size={16} /> {showFilters ? "Hide Filters" : "Advanced Filters"}
                            </div>

                            {showFilters && (
                                <div className={styles.filterBar}>
                                    <div className={styles.filterItem}>
                                        <label>Min Price</label>
                                        <input type="number" name="minPrice" placeholder="0" value={searchParams.minPrice} onChange={handleSearchChange} />
                                    </div>
                                    <div className={styles.filterItem}>
                                        <label>Max Price</label>
                                        <input type="number" name="maxPrice" placeholder="5000" value={searchParams.maxPrice} onChange={handleSearchChange} />
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>



            {/* 2 & 4. Results Section (Available Rides) */}
            <div className="container" style={{ marginTop: '2rem' }}>
                <div className={styles.resultsSection}>
                    {!hasSearched ? (
                        <div className={styles.emptyState} style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px' }}>
                            <Search size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
                            <h3 style={{ color: '#64748b' }}>Ready to go?</h3>
                            <p style={{ color: '#94a3b8' }}>Enter your route and click search to see available rides.</p>
                        </div>
                    ) : (
                        loading ? <p>Searching...</p> : rides.length === 0 ? <div className={styles.emptyState}>No rides found.</div> : (
                            <div className={styles.ridesGrid}>
                                {rides.map((ride) => (
                                    <div key={ride.id} className={styles.rideCard}>
                                        <div className={styles.cardHeader}>
                                            <div className={styles.driverInfo} onClick={() => setViewProfileId(ride.driver.id)} style={{ cursor: 'pointer' }}>
                                                <div className={styles.avatar}>{ride.driver.name[0]}</div>
                                                <div><h4>{ride.driver.name}</h4><p className={styles.carModel}>{ride.driver.vehicleModel}</p></div>
                                            </div>
                                            <div className={styles.price}>₹{ride.pricePerSeat}</div>
                                        </div>
                                        <div className={styles.rideDetails}>
                                            <div className={styles.timeLoc}>
                                                <Calendar size={16} /> {new Date(ride.travelDate).toLocaleDateString('en-GB')} • <Clock size={16} /> {ride.travelTime}
                                            </div>
                                            <div className={styles.seats}><User size={16} /> {ride.availableSeats} seats</div>
                                        </div>
                                        <div className={styles.routeDisplay}>{ride.source} ➝ {ride.destination}</div>
                                        {ride.stopovers && (
                                            <div className={styles.stopovers}>
                                                <MapPin size={14} style={{ flexShrink: 0 }} />
                                                <span>Stopovers: {ride.stopovers}</span>
                                            </div>
                                        )}
                                        <div className={styles.cardActions}>
                                            <Button variant="outline" onClick={() => handleViewMap(ride)} className={styles.mapBtn}>
                                                <MapIcon size={16} /> View Map
                                            </Button>
                                            <Button className={styles.bookBtn} onClick={() => handleBookClick(ride)}>Request to Book</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* 3. Recent Searches */}
            {recentRoutes.length > 0 && (
                <div className="container" style={{ marginTop: '2rem' }}>
                    <div className={styles.quickBookSection}>
                        <h3 className={styles.quickBookTitle}>Recent Searches</h3>
                        <div className={styles.quickBookGrid}>
                            {recentRoutes.map((route, idx) => (
                                <QuickBookCard key={idx} route={route} onClick={handleQuickBook} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Live Tracking (Moved Down) */}
            {activeRide && activeRide.status !== 'COMPLETED' && activeRide.status !== 'CANCELLED' && activeRide.status !== 'CANCELLED_BY_ADMIN' && (
                <div className="container" style={{ marginTop: '3rem' }}>
                    <div className={styles.sectionTitle} style={{ marginBottom: '1rem' }}>Current Ride Status</div>
                    <LiveTrackingCard activeRide={activeRide} />
                </div>
            )}





            {/* Modals */}
            {viewProfileId && <UserProfileModal 
                userId={viewProfileId} 
                onClose={() => setViewProfileId(null)} 
                hasBooked={history.some(booking => 
                    booking.ride?.driver?.id === viewProfileId && 
                    (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED')
                )}
            />}
            {reviewBooking && (
                <ReviewModal
                    booking={reviewBooking}
                    onClose={() => setReviewBooking(null)}
                    onSuccess={handleReviewSuccess}
                />
            )}

            {selectedRide && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2>Confirm your booking</h2>
                        <div className={styles.modalContent}>
                            <div className={styles.summaryRow}>
                                <span>Driver: </span>
                                <div style={{ textAlign: 'left' }}>
                                    <strong>{selectedRide.driver.name}</strong>
                                    <div className={styles.verifiedBadge}><ShieldCheck size={14} /> Verified Driver</div>
                                </div>
                            </div>
                            <div className={styles.summaryRow}><span>Route: </span> <strong>{selectedRide.source} ➝ {selectedRide.destination}</strong></div>

                            <div className={styles.inputRow}>
                                <label>Number of Seats</label>
                                <div className={styles.stepperContainer}>
                                    <button
                                        className={styles.stepperBtn}
                                        onClick={() => setSeatsToBook(s => Math.max(1, s - 1))}
                                        disabled={seatsToBook <= 1 || bookingStatus === 'loading'}
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className={styles.stepperValue}>{seatsToBook}</span>
                                    <button
                                        className={styles.stepperBtn}
                                        onClick={() => setSeatsToBook(s => Math.min(selectedRide.availableSeats, s + 1))}
                                        disabled={seatsToBook >= selectedRide.availableSeats || bookingStatus === 'loading'}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                <div className={styles.seatLimit}>{selectedRide.availableSeats} seats available</div>
                            </div>

                            <div className={styles.totalRow}>
                                <span>Total Price</span>
                                <span className={styles.totalPrice}>₹{selectedRide.pricePerSeat * seatsToBook}</span>
                            </div>
                            <p className={styles.reassurance}>You won’t be charged until the driver accepts your request.</p>
                        </div>
                        <div className={styles.modalActions}>
                            <Button 
                                variant="outline" 
                                onClick={() => setSelectedRide(null)}
                                disabled={bookingStatus === 'loading'}
                            >
                                Go Back
                            </Button>
                            <Button 
                                onClick={confirmBooking} 
                                disabled={bookingStatus === 'loading'}
                            >
                                {bookingStatus === 'loading' ? 'Requesting...' : 'Request Booking'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Map Modal */}
            {selectedMapRide && (
                <div className={styles.modalOverlay} onClick={() => setSelectedMapRide(null)}>
                    <div className={styles.mapModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.mapModalHeader}>
                            <h2>Route Map</h2>
                            <button className={styles.closeBtn} onClick={() => setSelectedMapRide(null)}>×</button>
                        </div>
                        <div className={styles.mapModalRoute}>
                            {selectedMapRide.source} ➝ {selectedMapRide.destination}
                        </div>
                        <div className={styles.mapModalContent}>
                            <InteractiveMap
                                rides={[selectedMapRide]}
                                style={{ height: '100%', width: '100%' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <LocalToast toasts={toasts} onRemove={removeToast} />
        </div>
    );
};

export default PassengerDashboard;

