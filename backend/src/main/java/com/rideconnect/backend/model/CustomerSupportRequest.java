package com.rideconnect.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "customer_support_requests", indexes = {
        @Index(name = "idx_support_status", columnList = "status"),
        @Index(name = "idx_support_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerSupportRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @ManyToOne
    @JoinColumn(name = "ride_id")
    private Ride ride;

    @ManyToOne(optional = false)
    @JoinColumn(name = "passenger_id", nullable = false)
    private User passenger;

    @ManyToOne
    @JoinColumn(name = "driver_id")
    private User driver;

    @Column(length = 200)
    private String rideSource;

    @Column(length = 200)
    private String rideDestination;

    private LocalDate rideDate;

    private LocalTime rideTime;

    @Column(length = 2000, nullable = false)
    private String issueDescription;

    @Column(nullable = false)
    private Boolean refundRequested;

    @ElementCollection
    @CollectionTable(name = "customer_support_evidence", joinColumns = @JoinColumn(name = "support_request_id"))
    @Column(name = "evidence_url", length = 500)
    private java.util.List<String> evidenceUrls;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SupportStatus status;

    @Column(length = 1000)
    private String adminNotes;

    private Long adminId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
