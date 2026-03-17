package com.rideconnect.backend.service.event;

public class BookingRejectedEvent {
    private final Long bookingId;

    public BookingRejectedEvent(Long bookingId) {
        this.bookingId = bookingId;
    }

    public Long getBookingId() {
        return bookingId;
    }
}
