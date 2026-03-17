package com.rideconnect.backend.dto;

import com.rideconnect.backend.model.PassengerCancelReason;
import lombok.Data;

@Data
public class CancelBookingRequest {
    private PassengerCancelReason reason;
    private String reasonText;
}
