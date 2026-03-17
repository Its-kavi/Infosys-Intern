package com.rideconnect.backend.service;

import com.rideconnect.backend.model.Booking;
import com.rideconnect.backend.model.Payment;
import com.rideconnect.backend.repository.jpa.BookingRepository;
import com.rideconnect.backend.repository.jpa.PaymentRepository;
import com.rideconnect.backend.repository.jpa.UserRepository;
import com.rideconnect.backend.service.payment.PaymentProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.time.format.TextStyle;
import java.util.stream.Collectors;

@Service
public class PaymentService {

    @Autowired private PaymentRepository paymentRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private UserRepository userRepository;
    @Autowired @Qualifier("razorpayProvider") private PaymentProvider razorpayProvider;
    @Autowired @Qualifier("mockProvider") private PaymentProvider mockProvider;
    @Autowired private NotificationService notificationService;
    @Autowired private EmailService emailService;

    // --- TAX CONSTANTS ---
    @Value("${payment.gst-rate}")
    private double gstRate;

    @Value("${payment.platform-fee-rate}")
    private double platformFeeRate;

    @Value("${payment.net-deduction-factor}")
    private double netDeductionFactor;

    @Value("${payment.status.success}")
    private String paymentStatusSuccess;

    @Value("${payment.status.confirmed}")
    private String bookingStatusConfirmed;

    @Value("${payment.status.onboarded}")
    private String bookingStatusOnboarded;

    @Value("${mock.provider}")
    private String mockProviderName;

    @Value("${razorpay.provider}")
    private String razorpayProviderName;

    // Helper: Calculates Base + Taxes
    private Double calculateTotalWithTaxes(Booking booking) {
        Double baseFare = booking.getRide().getPricePerSeat() * booking.getSeatsBooked();
        Double gst = baseFare * gstRate;
        Double platformFee = baseFare * platformFeeRate;

        // Round to 2 decimal places
        return Math.round((baseFare + gst + platformFee) * 100.0) / 100.0;
    }

    public Map<String, Object> initiatePayment(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!bookingStatusOnboarded.equals(booking.getStatus())) {
            throw new RuntimeException("Payment is allowed only after onboarding");
        }

        // UPDATED: Charge the Total Amount (Base + Tax + Fee)
        Double totalAmount = calculateTotalWithTaxes(booking);

        try {
            return razorpayProvider.createOrder(totalAmount, bookingId);
        } catch (Exception e) {
            try {
                return mockProvider.createOrder(totalAmount, bookingId);
            } catch (Exception ex) {
                throw new RuntimeException("Payment init failed");
            }
        }
    }

    public Payment completePayment(Long bookingId, String orderId, String paymentId, String signature, String providerType) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!bookingStatusOnboarded.equals(booking.getStatus())) {
            throw new RuntimeException("Payment is allowed only after onboarding");
        }

        boolean isVerified = false;
        try {
            if (providerType == null) providerType = mockProviderName;
            if (razorpayProviderName.equalsIgnoreCase(providerType)) {
                isVerified = razorpayProvider.verifyPayment(orderId, paymentId, signature);
            } else {
                isVerified = true;
            }
        } catch (Exception e) {
            throw new RuntimeException("Payment verification failed");
        }

        if (isVerified) {
            // UPDATED: Save the Total Amount in the database
            Double totalAmount = calculateTotalWithTaxes(booking);

            Payment payment = Payment.builder()
                    .booking(booking)
                    .amount(totalAmount)
                    .paymentMethod(providerType)
                    .transactionId(paymentId)
                    .orderId(orderId)
                    .status(paymentStatusSuccess)
                    .paymentTime(LocalDateTime.now())
                    .build();

            paymentRepository.save(payment);
            booking.setStatus(bookingStatusConfirmed);
            
            bookingRepository.save(booking);

            emailService.sendBookingConfirmation(
                    booking.getPassenger().getEmail(),
                    booking.getPassenger().getName(),
                    booking.getRide().getSource(),
                    booking.getRide().getDestination(),
                    payment.getAmount(),
                    booking.getOnboardingOtp()
            );

            // Notify Driver
            String driverEmail = booking.getRide().getDriver().getEmail();
            notificationService.notifyUser(driverEmail, "New Booking!",
                    booking.getPassenger().getName() + " paid for " + booking.getSeatsBooked() + " seat(s).", "SUCCESS");

            // Notify Passenger
            notificationService.notifyUser(booking.getPassenger().getEmail(), "Booking Confirmed",
                    "Your ride is confirmed. Total Paid: ₹" + totalAmount, "SUCCESS");

            return payment;
        } else {
            throw new RuntimeException("Invalid Signature");
        }
    }

    public List<Map<String, Object>> getDriverWeeklyEarnings(String driverEmail) {
        // 1. Get all successful payments for this driver
        List<Payment> payments = paymentRepository.findDriverEarnings(driverEmail);

        // 2. Initialize last 7 days with 0.0
        Map<LocalDate, Double> dailyMap = new LinkedHashMap<>();
        LocalDate today = LocalDate.now();
        for (int i = 6; i >= 0; i--) {
            dailyMap.put(today.minusDays(i), 0.0);
        }

        // 3. Aggregate actual earnings
        // Note: In real app, filter query by date range for performance.
        // Here we filter the list for simplicity.
        for (Payment p : payments) {
            LocalDate pDate = p.getPaymentTime().toLocalDate();
            if (dailyMap.containsKey(pDate)) {
                // Determine Net Income (after 7% deduction)
                double netAmount = p.getAmount() / netDeductionFactor;
                dailyMap.put(pDate, dailyMap.get(pDate) + netAmount);
            }
        }

        // 4. Convert to List for JSON (e.g., [{name: "Mon", amount: 500}])
        return dailyMap.entrySet().stream().map(entry -> {
            Map<String, Object> map = new HashMap<>();
            map.put("name", entry.getKey().getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH));
            map.put("amount", Math.round(entry.getValue())); // Round to nearest integer
            return map;
        }).collect(Collectors.toList());
    }

    public List<Payment> getMyPaymentHistory(String email) {
        var user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        if(user.getRole() == com.rideconnect.backend.model.Role.DRIVER) {
            return paymentRepository.findDriverEarnings(email);
        }
        return paymentRepository.findByBooking_Passenger_Email(email);
    }
}
