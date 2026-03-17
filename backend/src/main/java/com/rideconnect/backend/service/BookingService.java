package com.rideconnect.backend.service;

import com.rideconnect.backend.dto.RoutePresetDto;
import com.rideconnect.backend.model.Booking;
import com.rideconnect.backend.model.PassengerCancelReason;
import com.rideconnect.backend.model.Ride;
import com.rideconnect.backend.model.User;
import com.rideconnect.backend.service.event.BookingAcceptedEvent;
import com.rideconnect.backend.service.event.BookingCancelledEvent;
import com.rideconnect.backend.service.event.BookingRejectedEvent;
import com.rideconnect.backend.service.event.BookingRequestedEvent;
import com.rideconnect.backend.repository.jpa.BookingRepository;
import com.rideconnect.backend.repository.jpa.RideRepository;
import com.rideconnect.backend.repository.jpa.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BookingService {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private RideRepository rideRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Value("${payment.status.pending-approval}")
    private String statusPendingApproval;

    @Value("${payment.status.pending-payment}")
    private String statusPendingPayment;

    @Value("${payment.status.rejected}")
    private String statusRejected;

    @Value("${payment.status.cancelled}")
    private String statusCancelled;

    @Value("${payment.status.onboarded}")
    private String statusOnboarded;

    @Value("${payment.otp.length}")
    private int otpLength;

    @Value("${ride.status.in-progress}")
    private String rideStatusInProgress;

    @Value("${booking.message.arriving-soon}")
    private String messageArrivingSoon;

    @Value("${booking.message.due-now}")
    private String messageDueNow;

    @Transactional
    @CacheEvict(value = "rides", key = "T(org.springframework.cache.interceptor.SimpleKey).EMPTY")
    public Booking bookRide(Long rideId, Integer seats, String passengerEmail) {
        User passenger = userRepository.findByEmail(passengerEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passenger.isEmailVerified()) throw new RuntimeException("Please verify your email before booking a ride.");

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        // Validations
        LocalDate today = LocalDate.now();
        if (ride.getTravelDate().isBefore(today)) throw new RuntimeException("Cannot book past rides");
        if (ride.getDriver().getId().equals(passenger.getId())) throw new RuntimeException("Cannot book own ride");

        boolean exists = bookingRepository.existsByRideIdAndPassengerEmailAndStatusNot(rideId, passengerEmail, statusCancelled);
        if (exists) throw new RuntimeException("You have already requested/booked this ride!");

        if (ride.getAvailableSeats() < seats) {
            throw new RuntimeException("Not enough seats available!");
        }

        // Reserve seats immediately to prevent overbooking while waiting for approval
        ride.setAvailableSeats(ride.getAvailableSeats() - seats);
        rideRepository.save(ride);

        Booking booking = Booking.builder()
                .ride(ride)
                .passenger(passenger)
                .seatsBooked(seats)
                .bookingTime(LocalDateTime.now())
                // CHANGED: New Initial Status
                .status(statusPendingApproval)
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        eventPublisher.publishEvent(new BookingRequestedEvent(savedBooking.getId()));

        return savedBooking;
    }

    // --- NEW: Driver Accepts Booking ---
    @Transactional
    @CacheEvict(value = "rides", key = "T(org.springframework.cache.interceptor.SimpleKey).EMPTY")
    public void acceptBooking(Long bookingId, String driverEmail) {
        Booking booking = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));

        // Security Check
        if (!booking.getRide().getDriver().getEmail().equals(driverEmail)) {
            throw new RuntimeException("Not authorized to accept this booking");
        }

        if (!statusPendingApproval.equals(booking.getStatus())) {
            throw new RuntimeException("Booking is not pending approval");
        }

        booking.setStatus(statusPendingPayment);
        if (booking.getOnboardingOtp() == null || booking.getOnboardingOtp().isEmpty()) {
            String otp = String.format("%0" + otpLength + "d", new java.util.Random().nextInt((int) Math.pow(10, otpLength)));
            booking.setOnboardingOtp(otp);
        }
        bookingRepository.save(booking);

        eventPublisher.publishEvent(new BookingAcceptedEvent(booking.getId()));
    }

    // --- NEW: Driver Rejects Booking ---
    @Transactional
    @CacheEvict(value = "rides", key = "T(org.springframework.cache.interceptor.SimpleKey).EMPTY")
    public void rejectBooking(Long bookingId, String driverEmail) {
        Booking booking = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getRide().getDriver().getEmail().equals(driverEmail)) {
            throw new RuntimeException("Not authorized");
        }

        if (!statusPendingApproval.equals(booking.getStatus())) {
            throw new RuntimeException("Cannot reject this booking");
        }

        // Restore Seats
        Ride ride = booking.getRide();
        ride.setAvailableSeats(ride.getAvailableSeats() + booking.getSeatsBooked());
        rideRepository.save(ride);

        booking.setStatus(statusRejected);
        bookingRepository.save(booking);

        eventPublisher.publishEvent(new BookingRejectedEvent(booking.getId()));
    }

    @Transactional
    @CacheEvict(value = "rides", key = "T(org.springframework.cache.interceptor.SimpleKey).EMPTY")
    public void cancelBooking(Long bookingId, String userEmail, PassengerCancelReason reason, String reasonText) {
        Booking booking = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        if (!booking.getPassenger().getEmail().equals(userEmail)) throw new RuntimeException("Not authorized");

        if (booking.getStatus().contains(statusCancelled) || statusRejected.equals(booking.getStatus())) {
            throw new RuntimeException("Booking is already cancelled/rejected");
        }

        String resolvedReasonText = resolvePassengerCancelReasonText(reason, reasonText);

        Ride ride = booking.getRide();
        ride.setAvailableSeats(ride.getAvailableSeats() + booking.getSeatsBooked());
        rideRepository.save(ride);

        booking.setStatus(statusCancelled);
        bookingRepository.save(booking);

        eventPublisher.publishEvent(new BookingCancelledEvent(booking.getId(), resolvedReasonText));
    }

    @Transactional
    public void verifyOnboarding(Long bookingId, String otp, String driverEmail) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getRide().getDriver().getEmail().equals(driverEmail)) {
            throw new RuntimeException("Not authorized: You are not the driver for this ride");
        }

        if (!statusPendingPayment.equals(booking.getStatus())) {
            throw new RuntimeException("Booking is not ready for onboarding");
        }

        if (booking.getOnboardingOtp() == null || !booking.getOnboardingOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP. Verification failed.");
        }

        booking.setStatus(statusOnboarded);
        bookingRepository.save(booking);

        notificationService.notifyUser(booking.getPassenger().getEmail(), "Onboarding Successful",
                "You have been successfully onboarded for your ride to " + booking.getRide().getDestination(), "SUCCESS");
    }

    public List<Booking> getMyBookings(String email) {
        return bookingRepository.findByPassengerEmail(email);
    }

    // --- NEW: Get Frequent Routes ---
    public List<RoutePresetDto> getRecentRoutes(String email) {
        List<Object[]> results = bookingRepository.findTopRoutesByPassenger(email);
        return results.stream()
                .map(row -> new RoutePresetDto(
                        (String) row[0], // source
                        (String) row[1], // destination
                        (Long) row[2]    // count
                ))
                .collect(Collectors.toList());
    }

    // --- NEW: Get Active Ride for Today ---
    public Booking getActiveRideForToday(String email) {
        List<Booking> active = bookingRepository.findActiveBookingsForToday(email, LocalDate.now());
        if (active.isEmpty()) return null;
        
        Booking booking = active.get(0);
        
        // Calculate Estimated Arrival Time (Simple approach: Duration until ride starts)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime rideStartTime = LocalDateTime.of(booking.getRide().getTravelDate(), booking.getRide().getTravelTime());
        
        if (rideStartTime.isAfter(now)) {
            Duration duration = Duration.between(now, rideStartTime);
            long hours = duration.toHours();
            long mins = duration.toMinutesPart();
            
            String timeStr = "";
            if (hours > 0) timeStr += hours + " hours ";
            timeStr += mins + " mins";
            
            booking.setEstimatedArrivalTime(timeStr);
        } else if (rideStatusInProgress.equals(booking.getRide().getStatus())) {
            // If ride started, we don't have real-time GPS here yet, 
            // but we could estimate based on distance. 
            // For now, let frontend handle dynamic duration via Google Maps, 
            // but we provide a static fallback if needed.
            booking.setEstimatedArrivalTime(messageArrivingSoon);
        } else {
            booking.setEstimatedArrivalTime(messageDueNow);
        }

        return booking;
    }

    private String resolvePassengerCancelReasonText(PassengerCancelReason reason, String reasonText) {
        if (reason == null) {
            throw new RuntimeException("Cancellation reason is required");
        }
        return switch (reason) {
            case CHANGED_PLANS -> "Changed plans";
            case LONG_WAIT_TIME -> "Long wait time";
            case BETTER_RIDE_AVAILABLE -> "Better ride available";
            case INCORRECT_PICKUP -> "Incorrect pickup location";
            case OTHER -> {
                if (reasonText == null || reasonText.trim().isEmpty()) {
                    throw new RuntimeException("Reason description is required for OTHER");
                }
                yield reasonText.trim();
            }
        };
    }
}
