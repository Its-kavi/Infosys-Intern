package com.rideconnect.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "bookings",
        indexes = {
                @Index(name = "idx_bookings_ride_id", columnList = "ride_id"),
                @Index(name = "idx_bookings_passenger_id", columnList = "passenger_id"),
                @Index(name = "idx_bookings_status", columnList = "status"),
                @Index(name = "idx_bookings_ride_passenger_status", columnList = "ride_id,passenger_id,status")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Which Ride is booked?
    @ManyToOne
    @JoinColumn(name = "ride_id", nullable = false)
    private Ride ride;

    // Who is the Passenger?
    @ManyToOne
    @JoinColumn(name = "passenger_id", nullable = false)
    private User passenger;

    // How many seats?
    @Column(nullable = false)
    private Integer seatsBooked;

    // When did they book?
    private LocalDateTime bookingTime;

    // Status: BOOKED, CONFIRMED, ONBOARDED, CANCELLED
    @Column(nullable = false)
    private String status;

    private String onboardingOtp;

    @Transient
    private String estimatedArrivalTime; // e.g., "2 hours 58 mins"
}
