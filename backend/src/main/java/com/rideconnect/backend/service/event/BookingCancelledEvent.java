package com.rideconnect.backend.service.event;

public class BookingCancelledEvent {
    private final Long bookingId;
    private final String reasonText;

    public BookingCancelledEvent(Long bookingId, String reasonText) {
        this.bookingId = bookingId;
        this.reasonText = reasonText;
    }

    public Long getBookingId() {
        return bookingId;
    }

    public String getReasonText() {
        return reasonText;
    }
}
