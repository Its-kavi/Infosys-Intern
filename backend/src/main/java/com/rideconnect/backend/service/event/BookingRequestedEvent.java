package com.rideconnect.backend.service.event;

public class BookingRequestedEvent {
    private final Long bookingId;

    public BookingRequestedEvent(Long bookingId) {
        this.bookingId = bookingId;
    }

    public Long getBookingId() {
        return bookingId;
    }
}
