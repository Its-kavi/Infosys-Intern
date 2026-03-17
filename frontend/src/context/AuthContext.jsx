import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

// Helper function to decode JWT token and extract user ID
const decodeToken = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Failed to decode token:', error);
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('userRole');
        const name = localStorage.getItem('userName');
        const email = localStorage.getItem('userEmail');
        const userId = localStorage.getItem('userId');
        const isVerified = localStorage.getItem('userVerified') === 'true';

        if (token) {
            // Extract user ID from token if not in localStorage
            let id = userId;
            if (!id) {
                const decoded = decodeToken(token);
                id = decoded?.sub || decoded?.userId || decoded?.id;
                if (id) {
                    localStorage.setItem('userId', id);
                }
            }

            setUser({ id, token, role, name, email, isVerified });
        }
        setLoading(false);
    }, []);

    const login = (token, role, name, email, isVerified, userId) => {
        // Extract user ID from token if not provided
        let id = userId;
        if (!id && token) {
            const decoded = decodeToken(token);
            id = decoded?.sub || decoded?.userId || decoded?.id;
        }

        localStorage.setItem('token', token);
        localStorage.setItem('userRole', role);
        if (id) localStorage.setItem('userId', id);
        if (name) localStorage.setItem('userName', name);
        if (email) localStorage.setItem('userEmail', email);
        localStorage.setItem('userVerified', isVerified);

        setUser({ id, token, role, name, email, isVerified });
    };

    const logout = async () => {
        try {
            // Call the logout endpoint to blacklist the token
            const token = localStorage.getItem('token');
            if (token) {
                await fetch('http://localhost:8080/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout API call failed:', error);
            // Continue with local cleanup even if API fails
        } finally {
            // Always clear local storage and state
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userId');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userVerified');
            setUser(null);
            try {
                if (window && window.location && window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            } catch (e) {
                // ignore
            }
        }
    };

    const updateUser = (updates) => {
        setUser((prevUser) => {
            const base = prevUser || {};
            const newUser = { ...base, ...updates };

            if (updates.token) localStorage.setItem('token', updates.token);
            if (updates.role || updates.userRole) localStorage.setItem('userRole', updates.userRole || updates.role);
            if (updates.id) localStorage.setItem('userId', updates.id);
            if (updates.name) localStorage.setItem('userName', updates.name);
            if (updates.email) localStorage.setItem('userEmail', updates.email);
            if (updates.isVerified !== undefined) localStorage.setItem('userVerified', String(updates.isVerified));

            return newUser;
        });
    };

    // Listen for global logout events (from fetch interceptor) and storage changes
    useEffect(() => {
        const handleAppLogout = () => {
            // Call the same cleanup as logout
            logout();
        };

        const handleStorage = (e) => {
            // If token was removed in another tab, sync logout here
            if (e.key === 'token' && e.newValue === null) {
                logout();
            }
        };

        window.addEventListener('app:logout', handleAppLogout);
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('app:logout', handleAppLogout);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
