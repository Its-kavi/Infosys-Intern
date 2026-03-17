package com.rideconnect.backend.repository.jpa;

import com.rideconnect.backend.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
        // Find all bookings by a specific passenger (My Bookings)
        List<Booking> findByPassengerEmail(String email);

        // Needed for RideService to cancel all bookings
        List<Booking> findByRideId(Long rideId);

        // FIND UPCOMING BOOKINGS FOR REMINDERS
        @Query("SELECT b FROM Booking b WHERE " +
                        "b.status = 'CONFIRMED' AND " +
                        "b.ride.travelDate = :today AND " +
                        "b.ride.travelTime BETWEEN :now AND :rangeEnd")
        List<Booking> findBookingsForReminder(
                        @Param("today") LocalDate today,
                        @Param("now") LocalTime now,
                        @Param("rangeEnd") LocalTime rangeEnd);

        boolean existsByRideIdAndPassengerEmailAndStatusNot(Long rideId, String email, String status);
        boolean existsByRideIdAndPassengerIdAndStatusNot(Long rideId, Long passengerId, String status);
        // --- DASHBOARD: Recent Routes (Top 3) ---
        @Query(value = "SELECT r.source, r.destination, COUNT(b.id) as freq " +
                        "FROM bookings b JOIN rides r ON b.ride_id = r.id " +
                        "JOIN users u ON b.passenger_id = u.id " +
                        "WHERE u.email = :email " +
                        "GROUP BY r.source, r.destination " +
                        "ORDER BY freq DESC LIMIT 3", nativeQuery = true)
        List<Object[]> findTopRoutesByPassenger(@Param("email") String email);

        // --- DASHBOARD: Active Ride for Today ---
        @Query("SELECT b FROM Booking b WHERE b.passenger.email = :email " +
                        "AND b.status IN ('PENDING_APPROVAL', 'PENDING_PAYMENT', 'CONFIRMED', 'ONBOARDED') " +
                        "AND b.ride.travelDate = :today " +
                        "AND b.ride.status IN ('AVAILABLE', 'FULL', 'IN_PROGRESS')")
        List<Booking> findActiveBookingsForToday(@Param("email") String email, @Param("today") LocalDate today);

}
