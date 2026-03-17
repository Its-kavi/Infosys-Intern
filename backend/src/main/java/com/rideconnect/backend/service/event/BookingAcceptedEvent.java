package com.rideconnect.backend.service.event;

public class BookingAcceptedEvent {
    private final Long bookingId;

    public BookingAcceptedEvent(Long bookingId) {
        this.bookingId = bookingId;
    }

    public Long getBookingId() {
        return bookingId;
    }
}
