package com.rideconnect.backend.controller;

import com.rideconnect.backend.dto.CancelBookingRequest;
import com.rideconnect.backend.dto.RoutePresetDto;
import com.rideconnect.backend.model.Booking;
import com.rideconnect.backend.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private BookingService bookingService;

    @PostMapping("/book")
    public ResponseEntity<?> bookRide(
            @RequestParam Long rideId,
            @RequestParam Integer seats,
            @AuthenticationPrincipal UserDetails userDetails) {

        Booking booking = bookingService.bookRide(rideId, seats, userDetails.getUsername());
        return ResponseEntity.ok(booking);
    }

    @GetMapping("/my-bookings")
    public List<Booking> getMyBookings(@AuthenticationPrincipal UserDetails userDetails) {
        return bookingService.getMyBookings(userDetails.getUsername());
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(
            @PathVariable Long id,
            @RequestBody CancelBookingRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (request == null || request.getReason() == null) {
            throw new RuntimeException("Cancellation reason is required");
        }
        bookingService.cancelBooking(id, userDetails.getUsername(), request.getReason(), request.getReasonText());
        return ResponseEntity.ok(Map.of("message", "Booking cancelled successfully"));
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<?> acceptBooking(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        bookingService.acceptBooking(id, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "Booking accepted"));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectBooking(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        bookingService.rejectBooking(id, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "Booking rejected"));
    }

    @PutMapping("/{id}/verify-onboarding")
    public ResponseEntity<?> verifyOnboarding(
            @PathVariable Long id,
            @RequestParam String otp,
            @AuthenticationPrincipal UserDetails userDetails) {
        bookingService.verifyOnboarding(id, otp, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "Passenger onboarded successfully"));
    }

    // --- NEW: Recent Routes Endpoint ---
    @GetMapping("/recent-routes")
    public ResponseEntity<List<RoutePresetDto>> getRecentRoutes(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(bookingService.getRecentRoutes(userDetails.getUsername()));
    }

    // --- NEW: Active Ride Endpoint ---
    @GetMapping("/active-ride")
    public ResponseEntity<?> getActiveRide(@AuthenticationPrincipal UserDetails userDetails) {
        Booking active = bookingService.getActiveRideForToday(userDetails.getUsername());
        if (active == null) {
            return ResponseEntity.noContent().build(); // 204 No Content if no ride today
        }
        return ResponseEntity.ok(active);
    }
}
