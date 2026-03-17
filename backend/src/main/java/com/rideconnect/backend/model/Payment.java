package com.rideconnect.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Link payment to a specific booking
    @OneToOne
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private String paymentMethod; // e.g., "RAZORPAY", "CASH"

    // Stores the Razorpay Payment ID (e.g., pay_Hsd23...)
    @Column(nullable = false)
    private String transactionId;

    // Stores the Razorpay Order ID (e.g., order_Iu2...)
    @Column(nullable = false)
    private String orderId;

    @Column(nullable = false)
    private String status; // SUCCESS, FAILED

    private LocalDateTime paymentTime;

}
