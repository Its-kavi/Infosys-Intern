package com.rideconnect.backend.repository.jpa;

import com.rideconnect.backend.model.Booking;
import com.rideconnect.backend.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // Finds payments for a specific passenger (Transaction History)
    List<Payment> findByBooking_Passenger_Email(String email);

    List<Payment> findByBooking_Ride_Driver_Email(String email);

    // Find payments where the Booking -> Ride -> Driver -> Email matches
    @Query("SELECT p FROM Payment p WHERE p.booking.ride.driver.email = :driverEmail")
    List<Payment> findDriverEarnings(@Param("driverEmail") String driverEmail);

    Optional<Payment> findByBookingId(Long bookingId);

    // Calculate Total Revenue (Sum of 'amount' where status is SUCCESS)
    // COALESCE ensures we return 0.0 instead of NULL if table is empty
    @Query("SELECT COALESCE(SUM(p.amount), 0.0) FROM Payment p WHERE p.status = 'SUCCESS'")
    Double calculateTotalRevenue();

    @Query("SELECT p FROM Payment p WHERE p.booking.passenger.email = :email AND p.paymentTime >= :startDate")
    List<Payment> findPassengerPaymentsSince(@Param("email") String email,
            @Param("startDate") java.time.LocalDateTime startDate);

    @Query("SELECT DISTINCT p.booking.passenger.email FROM Payment p")
    List<String> findAllPassengerEmails();
}
