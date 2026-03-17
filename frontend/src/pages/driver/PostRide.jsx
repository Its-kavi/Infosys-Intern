import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { postRide, calculateFare } from '../../services/api';
import styles from './PostRide.module.css';
import { Calculator, Car } from 'lucide-react';

const PostRide = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [calcLoading, setCalcLoading] = useState(false);
    const [error, setError] = useState('');
    const [suggestion, setSuggestion] = useState(null); // Store suggested price

    // Stopovers State (Chip Logic) - RESTORED
    const [currentStopover, setCurrentStopover] = useState('');
    const [stopoverList, setStopoverList] = useState([]);

    const [formData, setFormData] = useState({
        source: '',
        destination: '',
        date: '',
        time: '',
        seats: 3,
        price: ''
    });

    const handleAddStopover = () => {
        if (currentStopover.trim()) {
            if (!stopoverList.includes(currentStopover.trim())) {
                setStopoverList([...stopoverList, currentStopover.trim()]);
            }
            setCurrentStopover('');
        }
    };

    const handleRemoveStopover = (indexToRemove) => {
        setStopoverList(stopoverList.filter((_, index) => index !== indexToRemove));
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCalculate = async () => {
        if (!formData.source || !formData.destination) {
            setError("Please enter Source and Destination to calculate fare.");
            return;
        }
        setCalcLoading(true);
        setError('');
        try {
            const data = await calculateFare(formData.source, formData.destination);
            setSuggestion(data);
            // Auto-fill price with max fare if empty
            if (!formData.price) {
                setFormData(prev => ({ ...prev, price: data.suggestedFare }));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setCalcLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const payload = {
            source: formData.source,
            destination: formData.destination,
            stopovers: stopoverList.join(', '), // Join chips with comma
            travelDate: formData.date,
            travelTime: formData.time + ":00",
            availableSeats: parseInt(formData.seats),
            pricePerSeat: formData.price ? parseFloat(formData.price) : 0
        };

        try {
            await postRide(payload);
            navigate('/driver-dashboard');
        } catch (err) {
            const errorMessage = err.message || 'Failed to post ride.';
            // Check if error is related to email verification
            if (errorMessage.toLowerCase().includes('email') && 
                (errorMessage.toLowerCase().includes('verify') || 
                 errorMessage.toLowerCase().includes('verified') ||
                 errorMessage.toLowerCase().includes('verification'))) {
                setError('⚠️ Please verify your email before posting rides. Check your inbox for the verification link.');
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <Navbar />
            <div className="container">
                <div className={styles.formContainer}>
                    <div className={styles.header}>
                        <div className={styles.iconWrapper}>
                            <Car size={40} color="white" strokeWidth={1.5} />
                        </div>
                        <h1>Post a New Ride</h1>
                        <p className={styles.subtitle}>Share your journey and earn.</p>
                    </div>

                    {error && <div className={styles.errorAlert}>{error}</div>}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.row}>
                            <Input label="Source" id="source" name="source" placeholder="For better results, include the city/state.(Jayanagar, Bangalore)" value={formData.source} onChange={handleChange} required />
                            <Input label="Destination" id="destination" name="destination" placeholder="For better results, include the city/state.(Sillarahalli, Dharmapuri)" value={formData.destination} onChange={handleChange} required />
                        </div>

                        <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '10px' }}>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleCalculate}
                                disabled={calcLoading || !formData.source || !formData.destination}
                                style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            >
                                {calcLoading ? 'Calculating...' : <><Calculator size={14} /> Check Fare</>}
                            </Button>
                        </div>

                        {suggestion && (
                            <div className={styles.suggestionBox}>
                                <p><strong>Estimated Distance:</strong> {suggestion.distanceKm} km</p>
                                <p><strong>Estimated Duration:</strong> {suggestion.duration || 'Calculating...'}</p>
                                <p><strong>Max Allowed Fare:</strong> ₹{suggestion.suggestedFare}</p>
                                <small>You can set a lower price, but not higher. Backend validates this limit.</small>
                            </div>
                        )}

                        {/* Stopovers Input with Chips */}
                        <div className="input-group">
                            <label htmlFor="stopoverInput" style={{ fontWeight: 500, marginBottom: '8px', display: 'block', color: '#1e293b' }}>
                                Stopovers (Optional)
                            </label>
                            <div className={styles.stopoverInputWrapper}>
                                <input
                                    id="stopoverInput"
                                    type="text"
                                    placeholder="e.g. Kanchipuram"
                                    value={currentStopover}
                                    onChange={(e) => setCurrentStopover(e.target.value)}
                                    // Allow Enter key to add
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddStopover();
                                        }
                                    }}
                                />
                                <Button type="button" onClick={handleAddStopover} size="sm" style={{ height: '42px', minWidth: '80px' }}>
                                    Add
                                </Button>
                            </div>

                            {/* Chips List */}
                            {stopoverList.length > 0 && (
                                <div className={styles.chipsContainer}>
                                    {stopoverList.map((place, index) => (
                                        <div key={index} className={styles.chip}>
                                            {place}
                                            <span
                                                className={styles.chipRemove}
                                                onClick={() => handleRemoveStopover(index)}
                                                title="Remove"
                                            >
                                                ×
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className={styles.row}>
                            <Input label="Date" id="date" name="date" type="date" value={formData.date} onChange={handleChange} required />
                            <Input label="Time" id="time" name="time" type="time" value={formData.time} onChange={handleChange} required />
                        </div>

                        <div className={styles.row}>
                            <Input label="Available Seats" id="seats" name="seats" type="number" min="1" max="10" value={formData.seats} onChange={handleChange} required />
                            <Input
                                label="Price Per Seat (₹)"
                                id="price"
                                name="price"
                                type="number"
                                min="0"
                                max={suggestion ? suggestion.suggestedFare : undefined}
                                placeholder="Leave 0 for auto-calc"
                                value={formData.price}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.actions}>
                            <Button type="button" variant="outline" onClick={() => navigate('/driver-dashboard')}>Cancel</Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Publishing...' : 'Publish Ride'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PostRide;