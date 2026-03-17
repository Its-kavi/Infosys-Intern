package com.rideconnect.backend.dto;

import com.rideconnect.backend.model.SupportStatus;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
public class SupportRequestResponse {
    private Long id;
    private Long bookingId;
    private Long rideId;
    private Long passengerId;
    private String passengerName;
    private String passengerEmail;
    private Long driverId;
    private String driverName;
    private String driverEmail;
    private String rideSource;
    private String rideDestination;
    private LocalDate rideDate;
    private LocalTime rideTime;
    private String issueDescription;
    private Boolean refundRequested;
    private List<String> evidenceUrls;
    private SupportStatus status;
    private String adminNotes;
    private Long adminId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
