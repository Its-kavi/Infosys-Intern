package com.rideconnect.backend.service.event;

import com.rideconnect.backend.model.Booking;
import com.rideconnect.backend.model.Ride;
import com.rideconnect.backend.model.User;
import com.rideconnect.backend.repository.jpa.BookingRepository;
import com.rideconnect.backend.service.EmailService;
import com.rideconnect.backend.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

import java.util.Optional;

@Component
public class BookingEventListener {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private EmailService emailService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onBookingRequested(BookingRequestedEvent event) {
        Optional<Booking> bookingOpt = bookingRepository.findById(event.getBookingId());
        if (bookingOpt.isEmpty()) return;

        Booking booking = bookingOpt.get();
        Ride ride = booking.getRide();
        User passenger = booking.getPassenger();

        notificationService.notifyUser(
                ride.getDriver().getEmail(),
                "New Ride Request",
                passenger.getName() + " requested " + booking.getSeatsBooked() + " seat(s). Please Accept or Reject.",
                "INFO"
        );

        emailService.sendNewBookingAlertForDriver(
                ride.getDriver().getEmail(),
                ride.getDriver().getName(),
                passenger.getName(),
                ride.getSource(),
                ride.getDestination()
        );
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onBookingAccepted(BookingAcceptedEvent event) {
        Optional<Booking> bookingOpt = bookingRepository.findById(event.getBookingId());
        if (bookingOpt.isEmpty()) return;

        Booking booking = bookingOpt.get();
        User passenger = booking.getPassenger();

        notificationService.notifyUser(
                passenger.getEmail(),
                "Request Accepted!",
                "The driver accepted your request. Use OTP " + booking.getOnboardingOtp() + " at pickup before payment.",
                "SUCCESS"
        );

        emailService.sendEmail(
                passenger.getEmail(),
                "Your Ride OTP",
                "Your OTP for onboarding is: " + booking.getOnboardingOtp()
        );
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onBookingRejected(BookingRejectedEvent event) {
        Optional<Booking> bookingOpt = bookingRepository.findById(event.getBookingId());
        if (bookingOpt.isEmpty()) return;

        Booking booking = bookingOpt.get();
        User passenger = booking.getPassenger();

        notificationService.notifyUser(
                passenger.getEmail(),
                "Request Rejected",
                "The driver declined your request.",
                "ERROR"
        );
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onBookingCancelled(BookingCancelledEvent event) {
        Optional<Booking> bookingOpt = bookingRepository.findById(event.getBookingId());
        if (bookingOpt.isEmpty()) return;

        Booking booking = bookingOpt.get();
        Ride ride = booking.getRide();

        notificationService.notifyUser(
                ride.getDriver().getEmail(),
                "Booking Cancelled",
                booking.getPassenger().getName() + " cancelled their request. Reason: " + event.getReasonText(),
                "WARNING"
        );
    }
}
