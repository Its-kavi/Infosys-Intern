package com.rideconnect.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PassengerDto {
    private Long bookingId;
    private String name;
    private String phone;
    private String email;
    private Integer seatsBooked;
    private String bookingStatus;
    private Long userId; // Needed to click and view profile
    private String profilePictureUrl; // To show avatar in the list
    private String bio;
}
