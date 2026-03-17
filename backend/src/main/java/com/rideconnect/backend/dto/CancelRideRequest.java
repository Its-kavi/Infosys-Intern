package com.rideconnect.backend.dto;

import com.rideconnect.backend.model.DriverCancelReason;
import lombok.Data;

@Data
public class CancelRideRequest {
    private DriverCancelReason reason;
    private String reasonText;
}
