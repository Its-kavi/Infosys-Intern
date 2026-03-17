// src/services/api.js

const API_URL = "http://localhost:8080/api";

// Global fetch interceptor: clears stale auth data and forces login
if (typeof window !== "undefined" && window.fetch) {
  const _originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    try {
      const response = await _originalFetch(input, init);

      // If backend returns Unauthorized/Forbidden, wipe local auth and redirect
      if (response && (response.status === 401 || response.status === 403)) {
        // Avoid touching auth endpoints themselves
        const url = typeof input === "string" ? input : (input && input.url) ? input.url : "";
        const authPathRegex = /\/auth\/(login|register|forgot-password|reset-password|verify-email|logout)/i;

        if (!authPathRegex.test(url)) {
          ["token", "jwt", "user", "userRole", "userName", "userEmail", "userVerified", "userId"].forEach(k => localStorage.removeItem(k));

          // Dispatch a logout event so React contexts can listen if needed
          try {
            window.dispatchEvent(new Event('app:logout'));
          } catch (e) {
            // ignore
          }

          // Redirect to login page if not already there
          try {
            if (window.location && window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          } catch (e) {
            // ignore navigation errors
          }
        }
      }

      return response;
    } catch (err) {
      // Network errors bubble up as before
      throw err;
    }
  };
}

// Helper function to handle headers and tokens automatically
const getHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
  };
  const token = localStorage.getItem("token"); // <--- Get JWT from storage
  if (token) {
    headers["Authorization"] = `Bearer ${token}`; // <--- Attach it!
  }
  return headers;
};
// --- AUTH SERVICES ---

export const loginUser = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    // Response is not JSON
  }

  if (!response.ok) {
    throw new Error(data?.message || text || "Login failed");
  }

  // SAVE THE TOKEN AUTOMATICALLY
  if (data && data.token) {
    localStorage.setItem("token", data.token);
  }
  return data;
};

export const registerUser = async (userData) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    // Response is not JSON
  }

  if (!response.ok) {
    throw new Error(data?.message || text || "Registration failed");
  }

  return data;
};

export const forgotPassword = async (email) => {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to send reset link");
  }
  return data;
};

export const resetPassword = async (token, newPassword) => {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to reset password");
  }
  return data;
};

export const verifyEmail = async (token) => {
  const response = await fetch(`${API_URL}/auth/verify-email?token=${token}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    // Response is not JSON
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(data?.message || text || "Failed to verify email");
  }
  return data;
};

export const logoutUser = async () => {
  try {
    // Call the logout endpoint to blacklist the token in Redis
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: getHeaders(),
    });
    
    // Don't throw error if logout fails - still clear local storage
    if (!response.ok) {
      console.warn("Logout endpoint failed, but continuing with local cleanup");
    }
  } catch (error) {
    console.error("Error calling logout endpoint:", error);
    // Continue with cleanup even if the API call fails
    } finally {
    // Always clear local storage
    ["token", "userRole", "userName", "userEmail", "userVerified", "userId"].forEach(k => localStorage.removeItem(k));
  }
};


// --- RIDE SERVICES ---

export const postRide = async (rideData) => {
  const response = await fetch(`${API_URL}/rides/post`, {
    method: "POST",
    headers: getHeaders(), // <--- Uses the helper to attach token
    body: JSON.stringify(rideData),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to post ride");
  return data;
};

export const calculateFare = async (source, destination) => {
  const response = await fetch(`${API_URL}/rides/calculate?source=${source}&destination=${destination}`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to calculate fare");
  return data;
};

// --- UPDATED SEARCH FUNCTION ---
export const searchRides = async (filters) => {
  // filters is an object like: { source: '...', minPrice: 500, ... }

  // Remove empty keys to keep URL clean
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== null && filters[key] !== "") {
      params.append(key, filters[key]);
    }
  });

  const response = await fetch(`${API_URL}/rides/search?${params.toString()}`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Search failed");
  return data;
};

// --- BOOKING SERVICES ---

export const bookRide = async (rideId, seats) => {
  const response = await fetch(`${API_URL}/bookings/book?rideId=${rideId}&seats=${seats}`, {
    method: "POST",
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Booking failed");
  return data;
};

export const getMyBookings = async () => {
  const response = await fetch(`${API_URL}/bookings/my-bookings`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch bookings");
  return data;
};

// Get rides posted by current driver
export const getMyRides = async () => {
  const response = await fetch(`${API_URL}/rides/my-rides`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch my rides");
  return data;
};

// --- ADMIN SERVICES ---

export const getAllUsers = async () => {
  const response = await fetch(`${API_URL}/admin/users`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch users");
  return data;
};

export const getAllBookings = async () => {
  const response = await fetch(`${API_URL}/admin/bookings`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch bookings");
  return data;
};

export const getAllRides = async () => {
  const response = await fetch(`${API_URL}/admin/rides`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch rides");
  return data;
};

// Fetch Dashboard Stats
export const getAdminStats = async () => {
  const response = await fetch(`${API_URL}/admin/stats`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch stats");
  return data;
};

export const verifyDriver = async (driverId) => {
  const response = await fetch(`${API_URL}/admin/verify-driver/${driverId}`, {
    method: "PUT",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to verify driver");
  return data;
};

export const blockUser = async (userId) => {
  const response = await fetch(`${API_URL}/admin/users/${userId}/block`, {
    method: "PUT",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to block user");
  return data;
};

export const cancelRide = async (rideId) => {
  const response = await fetch(`${API_URL}/admin/rides/${rideId}/cancel`, {
    method: "PUT",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to cancel ride");
  return data;
};

export const cancelRideAdmin = async (rideId, reason) => {
  const response = await fetch(`${API_URL}/admin/rides/${rideId}/cancel`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ reason }), // Send reason in body
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to cancel ride");
  return data;
};

export const getProfile = async () => {
  const response = await fetch(`${API_URL}/users/profile`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch profile");
  return data;
};

export const updateProfile = async (profileData) => {
  const response = await fetch(`${API_URL}/users/profile`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(profileData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to update profile");
  return data;
};

// --- PAYMENT SERVICES ---

export const createOrder = async (bookingId) => {
  const response = await fetch(`${API_URL}/payments/create-order`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ bookingId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to create order");
  return data;
};

export const verifyPayment = async (paymentData) => {
  const response = await fetch(`${API_URL}/payments/verify`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(paymentData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Payment verification failed");
  return data;
};

export const getTransactionHistory = async () => {
  const response = await fetch(`${API_URL}/payments/history`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch history");
  return data;
};

// --- SUPPORT SERVICES ---

export const createSupportRequest = async (payload) => {
  const response = await fetch(`${API_URL}/support/requests`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to create support request");
  return data;
};

export const getMySupportRequests = async () => {
  const response = await fetch(`${API_URL}/support/requests/my`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch support requests");
  return data;
};

export const getAdminSupportRequests = async (params = {}) => {
  const query = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
      query.append(key, params[key]);
    }
  });
  const response = await fetch(`${API_URL}/admin/support-requests?${query.toString()}`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch support requests");
  return data;
};

export const updateSupportRequest = async (id, payload) => {
  const response = await fetch(`${API_URL}/admin/support-requests/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to update support request");
  return data;
};

export const cancelBooking = async (bookingId, reason, reasonText) => {
  const response = await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ reason, reasonText: reasonText || "" }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to cancel booking");
  return data;
};

export const cancelPublishedRide = async (rideId, reason, reasonText) => {
  const response = await fetch(`${API_URL}/rides/${rideId}/cancel`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ reason, reasonText: reasonText || "" }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to cancel ride");
  return data;
};

// Fetch passengers for a specific ride
export const getRidePassengers = async (rideId) => {
  const response = await fetch(`${API_URL}/rides/${rideId}/bookings`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch passengers");
  return data;
};

// --- DRIVER ACTIONS ---
export const acceptBookingRequest = async (bookingId) => {
  const response = await fetch(`${API_URL}/bookings/${bookingId}/accept`, {
    method: "PUT",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to accept booking");
  return data;
};

export const getDriverStats = async () => {
  const response = await fetch(`${API_URL}/payments/driver-stats`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch stats");
  return data;
};

export const rejectBookingRequest = async (bookingId) => {
  const response = await fetch(`${API_URL}/bookings/${bookingId}/reject`, {
    method: "PUT",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to reject booking");
  return data;
};

// --- RIDE LIFECYCLE (Driver) ---

export const startRide = async (rideId) => {
  const response = await fetch(`${API_URL}/rides/${rideId}/start`, {
    method: "PUT",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to start ride");
  return data;
};

export const completeRide = async (rideId) => {
  const response = await fetch(`${API_URL}/rides/${rideId}/complete`, {
    method: "PUT",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to complete ride");
  return data;
};

// --- PASSENGER ONBOARDING VERIFICATION ---

export const verifyOnboarding = async (bookingId, otp) => {
  const response = await fetch(`${API_URL}/bookings/${bookingId}/verify-onboarding?otp=${otp}`, {
    method: "PUT",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to verify passenger onboarding");
  return data;
};

// --- REVIEW SERVICES ---

export const submitReview = async (bookingId, rating, comment) => {
  const response = await fetch(`${API_URL}/reviews/submit`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ bookingId, rating, comment })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to submit review");
  return data;
};

export const getMyReviews = async () => {
  const response = await fetch(`${API_URL}/reviews/my-reviews`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch reviews");
  return data;
};

// --- PUBLIC PROFILE SERVICE ---
export const getUserPublicProfile = async (userId) => {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch public profile");
  return data;
};

// --- FILE UPLOAD SERVICE ---
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  // Note: Do NOT set Content-Type header manually for FormData. 
  // The browser sets it automatically with the correct boundary.
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: {
      // "Content-Type": "multipart/form-data", // <--- DO NOT ADD THIS
      "Authorization": `Bearer ${token}`
    },
    body: formData,
  });

  // Handle 403 or other errors before parsing JSON
  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Image upload failed");
    } else {
      const errorText = await response.text();
      throw new Error(errorText || `Image upload failed with status ${response.status}`);
    }
  }

  const data = await response.json();
  return data.url; // Returns the Cloudinary URL
};

export const getRecentRoutes = async () => {
  const response = await fetch(`${API_URL}/bookings/recent-routes`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch routes");
  return data;
};

export const getActiveRide = async () => {
  const response = await fetch(`${API_URL}/bookings/active-ride`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (response.status === 204) return null; // Handle empty
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch active ride");
  return data;
};

// --- NOTIFICATION SERVICES ---

export const getUnreadNotificationCount = async () => {
  const response = await fetch(`${API_URL}/notifications/unread-count`, {
    method: "GET",
    headers: getHeaders(),
  });
  
  if (response.status === 403) {
    throw new Error("Access denied. Please check your login status.");
  }
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch unread count");
  return data; // Returns the count number
};

export const getNotifications = async () => {
  const response = await fetch(`${API_URL}/notifications`, {
    method: "GET",
    headers: getHeaders(),
  });
  
  // Handle 403 Forbidden (user not authenticated or authorized)
  if (response.status === 403) {
    throw new Error("Access denied. Please check your login status.");
  }
  
  // Handle empty response
  if (response.status === 204) return [];
  
  // Check content type before parsing
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || "Failed to fetch notifications");
    }
    return [];
  }
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch notifications");
  return data;
};

export const markNotificationAsRead = async (notificationId) => {
  const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
    method: "PUT",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to mark notification as read");
  return data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await fetch(`${API_URL}/notifications/read-all`, {
    method: "PUT",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to mark all notifications as read");
  return data;
};

// --- CHAT SERVICES ---

/**
 * Fetch chat history for a specific trip/ride
 * @param {string} tripId - The trip/ride ID
 * @returns {Promise<Array>} Array of chat messages
 */
export const fetchChatHistory = async (tripId) => {
  const response = await fetch(`${API_URL}/chat/history/${tripId}`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    
    if (response.status === 403) {
      throw new Error(errorData?.message || "You are not authorized to view this chat.");
    }
    
    if (response.status === 404) {
      throw new Error(errorData?.message || "Ride not found");
    }
    
    if (response.status === 401) {
      throw new Error("User not authenticated");
    }
    
    throw new Error(errorData?.message || "Failed to fetch chat history");
  }

  const messages = await response.json();
  return messages;
};

/**
 * Get chat participants for a trip
 * @param {string} tripId - The trip/ride ID
 * @returns {Promise<Object>} Participant information
 */
export const getChatParticipants = async (tripId) => {
  const response = await fetch(`${API_URL}/trips/${tripId}/participants`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || "Failed to fetch participants");
  }

  const data = await response.json();
  return data;
};
