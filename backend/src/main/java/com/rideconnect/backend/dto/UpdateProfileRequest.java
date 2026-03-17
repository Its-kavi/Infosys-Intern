package com.rideconnect.backend.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    // Basic Details
    private String name;
    private String phone;

    // Password Update Fields (Optional)
    private String currentPassword;
    private String newPassword;

    // Driver Specific Fields (Optional - Ignored if user is Passenger)
    private String vehicleModel;
    private String licensePlate;
    private Integer vehicleCapacity;

    private String profilePictureUrl;
    private String bio;
    private String carImageUrl;
    private String carFeatures;
}
