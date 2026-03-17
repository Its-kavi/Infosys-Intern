package com.rideconnect.backend.dto;

import com.rideconnect.backend.model.SupportStatus;
import lombok.Data;

@Data
public class SupportRequestUpdateRequest {
    private SupportStatus status;
    private String adminNotes;
}
