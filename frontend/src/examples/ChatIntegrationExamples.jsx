// EXAMPLE INTEGRATION FILE - Copy patterns from here to integrate chat into your pages

/* ============================================================================
   EXAMPLE 1: Adding Chat to Booking Cards (Passenger Side)
   ============================================================================ */

import ChatButton from '../components/chat/ChatButton';
import { useChat } from '../context/ChatContext';

function BookingCardExample({ booking }) {
  const { getUnreadCount } = useChat();
  const unreadCount = getUnreadCount(booking.tripId);

  return (
    <div className="booking-card">
      <h3>Trip to {booking.destination}</h3>
      <p>Driver: {booking.driverName}</p>
      <p>Pickup: {booking.pickupTime}</p>
      
      <div className="actions">
        {/* Other action buttons */}
        
        <ChatButton
          tripId={booking.tripId}
          otherUser={{
            id: booking.driverId,
            name: booking.driverName,
          }}
          rideInfo={{
            from: booking.pickupLocation,
            to: booking.dropoffLocation,
          }}
          variant="primary"
          label={`Chat${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
        />
      </div>
    </div>
  );
}

/* ============================================================================
   EXAMPLE 2: Adding Chat to Active Rides (Driver Side)
   ============================================================================ */

function ActiveRideCardExample({ ride }) {
  return (
    <div className="ride-card">
      <h3>Active Ride</h3>
      <p>Passenger: {ride.passengerName}</p>
      <p>Pickup: {ride.pickupLocation}</p>
      <p>Destination: {ride.destination}</p>
      
      <div className="ride-actions">
        <button>View Details</button>
        <button>Navigate</button>
        
        <ChatButton
          tripId={ride.id}
          otherUser={{
            id: ride.passengerId,
            name: ride.passengerName,
          }}
          rideInfo={{
            from: ride.pickupLocation,
            to: ride.destination,
          }}
          variant="secondary"
          label="Message Passenger"
        />
      </div>
    </div>
  );
}

/* ============================================================================
   EXAMPLE 3: Using Link to Navigate to Full-Page Chat
   ============================================================================ */

import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

function RideDetailsExample({ ride }) {
  return (
    <div className="ride-details">
      <h2>Ride Details</h2>
      
      {/* Other ride information */}
      
      <div className="communication-section">
        <h3>Communication</h3>
        
        {/* Option 1: Using Link for navigation */}
        <Link 
          to={`/chat/${ride.tripId}`}
          className="chat-link"
        >
          <MessageCircle size={18} />
          Open Chat
        </Link>
        
        {/* Option 2: Using ChatButton for modal */}
        <ChatButton
          tripId={ride.tripId}
          otherUser={{
            id: ride.otherUserId,
            name: ride.otherUserName,
          }}
          variant="primary"
        />
      </div>
    </div>
  );
}

/* ============================================================================
   EXAMPLE 4: Adding Unread Badge to Navbar
   ============================================================================ */

import { useChat } from '../context/ChatContext';

function NavbarExample() {
  const { getTotalUnreadCount } = useChat();
  const totalUnread = getTotalUnreadCount();

  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/rides">Rides</Link>
      
      {/* Chat icon with badge */}
      <Link to="/messages" className="nav-icon">
        <MessageCircle size={20} />
        {totalUnread > 0 && (
          <span className="badge">{totalUnread}</span>
        )}
      </Link>
      
      <Link to="/profile">Profile</Link>
    </nav>
  );
}

/* ============================================================================
   EXAMPLE 5: Handling Chat in Ride Lifecycle
   ============================================================================ */

import { useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { fetchChatHistory } from '../services/api';

function RideTrackerExample({ activeRide }) {
  const { initializeChatSession, markAsRead, getUnreadCount } = useChat();

  // Initialize chat when ride becomes active
  useEffect(() => {
    if (activeRide) {
      loadChatForRide(activeRide.tripId);
    }
  }, [activeRide?.tripId]);

  const loadChatForRide = async (tripId) => {
    try {
      const history = await fetchChatHistory(tripId);
      initializeChatSession(tripId, history, {
        id: activeRide.otherUserId,
        name: activeRide.otherUserName,
      });
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  const unreadMessages = getUnreadCount(activeRide?.tripId);

  return (
    <div className="ride-tracker">
      <h2>Current Ride</h2>
      
      {/* Show notification if there are unread messages */}
      {unreadMessages > 0 && (
        <div className="alert">
          You have {unreadMessages} new message{unreadMessages > 1 ? 's' : ''}!
        </div>
      )}
      
      <ChatButton
        tripId={activeRide.tripId}
        otherUser={{
          id: activeRide.otherUserId,
          name: activeRide.otherUserName,
        }}
        variant="primary"
        label="Open Chat"
      />
    </div>
  );
}

/* ============================================================================
   EXAMPLE 6: Manual Chat Modal Control
   ============================================================================ */

import { useState } from 'react';
import ChatModal from '../components/chat/ChatModal';

function CustomIntegrationExample({ trip }) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleOpenChat = () => {
    // You can add custom logic here
    console.log('Opening chat for trip:', trip.id);
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    // You can add custom logic here
    console.log('Closing chat');
    setIsChatOpen(false);
  };

  return (
    <>
      <button onClick={handleOpenChat}>
        Contact {trip.driverName}
      </button>

      <ChatModal
        isOpen={isChatOpen}
        onClose={handleCloseChat}
        tripId={trip.id}
        otherUser={{
          id: trip.driverId,
          name: trip.driverName,
        }}
        rideInfo={{
          from: trip.pickup,
          to: trip.destination,
        }}
      />
    </>
  );
}

/* ============================================================================
   EXAMPLE 7: Connection Status Display
   ============================================================================ */

import { useChat } from '../context/ChatContext';

function StatusIndicatorExample() {
  const { connectionStatus, isConnected } = useChat();

  return (
    <div className="app-status">
      <div className={`status-indicator ${connectionStatus}`}>
        <span className="status-dot"></span>
        {connectionStatus === 'connected' && 'Online'}
        {connectionStatus === 'disconnected' && 'Offline'}
        {connectionStatus === 'reconnecting' && 'Reconnecting...'}
        {connectionStatus === 'failed' && 'Connection Failed'}
      </div>
    </div>
  );
}

/* ============================================================================
   EXAMPLE 8: Sending Messages Programmatically
   ============================================================================ */

import { useChat } from '../context/ChatContext';

function QuickResponseExample({ tripId, recipientId }) {
  const { sendMessage } = useChat();

  const sendQuickMessage = async (message) => {
    try {
      await sendMessage(tripId, recipientId, message);
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  return (
    <div className="quick-responses">
      <h4>Quick Responses</h4>
      <button onClick={() => sendQuickMessage("I'm on my way!")}>
        On my way
      </button>
      <button onClick={() => sendQuickMessage("I'll be there in 5 minutes")}>
        5 minutes away
      </button>
      <button onClick={() => sendQuickMessage("I'm here!")}>
        I'm here
      </button>
    </div>
  );
}

/* ============================================================================
   EXAMPLE 9: Chat History List
   ============================================================================ */

import { useChat } from '../context/ChatContext';

function ChatHistoryExample() {
  const { activeChatSessions } = useChat();
  
  // Convert Map to Array
  const sessions = Array.from(activeChatSessions.values());

  return (
    <div className="chat-history">
      <h2>Recent Chats</h2>
      
      {sessions.length === 0 ? (
        <p>No active chats</p>
      ) : (
        <div className="chat-list">
          {sessions.map((session) => (
            <Link 
              key={session.tripId} 
              to={`/chat/${session.tripId}`}
              className="chat-preview"
            >
              <div className="chat-info">
                <h4>{session.otherUser?.name || 'User'}</h4>
                <p className="last-message">
                  {session.lastMessage?.content || 'No messages yet'}
                </p>
              </div>
              <div className="chat-meta">
                <span className="time">
                  {formatTime(session.lastMessageTime)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   CSS EXAMPLES for styling the integrations
   ============================================================================ */

/*
.booking-card .actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.status-indicator.connected {
  background: #d1fae5;
  color: #065f46;
}

.status-indicator.disconnected {
  background: #fee2e2;
  color: #991b1b;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
*/

export {
  BookingCardExample,
  ActiveRideCardExample,
  RideDetailsExample,
  NavbarExample,
  RideTrackerExample,
  CustomIntegrationExample,
  StatusIndicatorExample,
  QuickResponseExample,
  ChatHistoryExample,
};
