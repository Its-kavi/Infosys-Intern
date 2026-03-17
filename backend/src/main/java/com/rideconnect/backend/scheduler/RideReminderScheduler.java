package com.rideconnect.backend.scheduler;

import com.rideconnect.backend.model.Booking;
import com.rideconnect.backend.repository.jpa.BookingRepository;
import com.rideconnect.backend.repository.jpa.PaymentRepository;
import com.rideconnect.backend.repository.jpa.UserRepository;
import com.rideconnect.backend.service.EmailService;
import com.rideconnect.backend.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Component
public class RideReminderScheduler {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private UserRepository userRepository;

    @Value("${scheduler.ride-reminder.upcoming-hours}")
    private long upcomingHours;

    @Value("${email.subject.ride-reminder}")
    private String rideReminderSubject;

    // Run every 30 minutes
    @Scheduled(fixedRateString = "${scheduler.ride-reminder.fixed-rate-ms}")
    public void sendRideReminders() {
        System.out.println("⏰ Checking for upcoming rides...");

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        LocalTime upcomingRange = now.plusHours(upcomingHours); // Check rides in next N hours

        List<Booking> upcomingBookings = bookingRepository.findBookingsForReminder(today, now, upcomingRange);

        for (Booking b : upcomingBookings) {
            String passengerEmail = b.getPassenger().getEmail();
            String message = "Your ride from " + b.getRide().getSource() + " to " + b.getRide().getDestination() + " starts soon at " + b.getRide().getTravelTime();

            // 1. Send In-App Notification
            notificationService.notifyUser(passengerEmail, "Ride Reminder", message, "INFO");

            // 2. Send Email
            emailService.sendEmail(passengerEmail, rideReminderSubject, message);

            System.out.println("   -> Reminded: " + passengerEmail);
        }
    }

    // Run on the 1st of every month at midnight
    @Scheduled(cron = "${scheduler.monthly-summary.cron}")
    public void sendMonthlySummaries() {
        System.out.println("📊 Generating monthly summaries...");
        List<String> emails = paymentRepository.findAllPassengerEmails();
        java.time.LocalDateTime oneMonthAgo = java.time.LocalDateTime.now().minusMonths(1);

        for (String email : emails) {
            com.rideconnect.backend.model.User user = userRepository.findByEmail(email).orElse(null);
            if (user != null && !user.isEmailOptOut()) {
                List<com.rideconnect.backend.model.Payment> payments = paymentRepository.findPassengerPaymentsSince(email, oneMonthAgo);
                double totalSpent = payments.stream().mapToDouble(com.rideconnect.backend.model.Payment::getAmount).sum();
                int rideCount = payments.size();

                if (rideCount > 0) {
                    emailService.sendMonthlySummary(email, user.getName(), totalSpent, rideCount);
                }
            }
        }
    }
}
