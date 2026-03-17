import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import DriverDashboard from './pages/driver/DriverDashboard';
import PostRide from './pages/driver/PostRide';
import DriverHistory from './pages/driver/DriverHistory';
import PassengerDashboard from './pages/passenger/PassengerDashboard';
import MyBookings from './pages/passenger/MyBookings';
import AdminDashboard from './pages/admin/AdminDashboard';
import Profile from './pages/Profile';
import TransactionHistory from './pages/TransactionHistory';
import ChatPage from './pages/chat/ChatPage';
import NotificationToast from './components/NotificationToast';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div className="container">Access Denied</div>; // Or redirect to their dashboard
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <Router>
          <NotificationToast />
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/history" element={<TransactionHistory />} />

          <Route
            path="/driver-dashboard"
            element={
              <ProtectedRoute allowedRoles={['DRIVER']}>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/post-ride"
            element={
              <ProtectedRoute allowedRoles={['DRIVER']}>
                <PostRide />
              </ProtectedRoute>
            }
          />

          <Route
            path="/driver-history"
            element={
              <ProtectedRoute allowedRoles={['DRIVER']}>
                <DriverHistory />
              </ProtectedRoute>
            }
          />

            // 2. Passenger Route
            <Route
                path="/history"
                element={
                <ProtectedRoute allowedRoles={['PASSENGER']}>
                    <TransactionHistory />
                </ProtectedRoute>} />

          <Route
            path="/passenger-dashboard"
            element={
              <ProtectedRoute allowedRoles={['PASSENGER']}>
                <PassengerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute allowedRoles={['PASSENGER']}>
                <MyBookings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat/:tripId"
            element={
              <ProtectedRoute allowedRoles={['DRIVER', 'PASSENGER']}>
                <ChatPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;
