package com.rideconnect.backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class SupportRequestCreateRequest {
    private Long bookingId;
    private String issueDescription;
    private Boolean refundRequested;
    private List<String> evidenceUrls;
}
