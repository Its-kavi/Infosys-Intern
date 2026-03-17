package com.rideconnect.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_users_email_verification_token", columnList = "emailVerificationToken"),
                @Index(name = "idx_users_password_reset_token", columnList = "passwordResetToken"),
                @Index(name = "idx_users_phone", columnList = "phone")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Core Profile Details
    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false)
    private String password; // Will be encrypted later

    @Column(nullable = false)
    private String phone;

    // --- NEW FIELDS FOR PROFILE ---
    private String profilePictureUrl; // URL for Driver/Passenger photo

    @Column(length = 500)
    private String bio; // e.g., "Hi, I am a software engineer..."
    
    // Role: Defines if they are a Driver or Passenger
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // --- Driver Specific Details (Nullable for Passengers) ---

    private String carImageUrl; // Photo of the car

    private String carFeatures; // e.g., "AC, Music, Pet Friendly"

    private String vehicleModel;

    private String licensePlate;

    private Integer vehicleCapacity; // e.g., 4 seats

    @Column(nullable = false)
    @Builder.Default
    private Double averageRating = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Integer totalReviews = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean isVerified = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean isActive = true;

    // --- EMAIL VERIFICATION & PREFERENCES ---
    private String emailVerificationToken;
    
    @Builder.Default
    private boolean isEmailVerified = false;

    @Builder.Default
    private boolean emailOptOut = false;

    // --- MEMBER SINCE ---
    private String memberSince; // Format: "January 2026"

    // --- PASSWORD RESET ---
    private String passwordResetToken;
    private java.time.LocalDateTime passwordResetTokenExpiry;

    // Helper method to check if user is a driver
    public boolean isDriver() {
        return this.role == Role.DRIVER;
    }
}
