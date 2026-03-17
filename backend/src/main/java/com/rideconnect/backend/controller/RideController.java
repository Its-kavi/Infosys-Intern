package com.rideconnect.backend.controller;

import com.rideconnect.backend.dto.CancelRideRequest;
import com.rideconnect.backend.dto.PassengerDto;
import com.rideconnect.backend.model.Ride;
import com.rideconnect.backend.service.RideService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rides")
public class RideController {

    @Autowired
    private RideService rideService;

    @PostMapping("/post")
    public Ride postRide(@RequestBody Ride ride, @AuthenticationPrincipal UserDetails userDetails) {
        return rideService.postRide(ride, userDetails.getUsername());
    }

    @GetMapping("/calculate")
    public ResponseEntity<?> calculateFare(@RequestParam String source, @RequestParam String destination) {
        try {
            Map<String, Object> details = rideService.calculateRideDetails(source, destination);
            return ResponseEntity.ok(details);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/all")
    public List<Ride> getAllRides() {
        return rideService.getAllRides();
    }

    @GetMapping("/my-rides")
    public List<Ride> getMyRides(@AuthenticationPrincipal UserDetails userDetails) {
        return rideService.getMyRides(userDetails.getUsername());
    }

    @GetMapping("/search")
    public List<Ride> searchRides(
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) Integer minSeats,
            @RequestParam(required = false) Double minRating) {

        LocalDate travelDate = null;
        if (date != null && !date.trim().isEmpty()) {
            travelDate = LocalDate.parse(date);
        }

        return rideService.searchRides(
                source, destination, travelDate,
                minPrice, maxPrice, minSeats, minRating
        );
    }

    @PutMapping("/{id}/start")
    public ResponseEntity<?> startRide(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        rideService.startRide(id, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "Ride started successfully"));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<?> completeRide(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        rideService.completeRide(id, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "Ride completed successfully"));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelRide(
            @PathVariable Long id,
            @RequestBody CancelRideRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (request == null || request.getReason() == null) {
            throw new RuntimeException("Cancellation reason is required");
        }
        rideService.cancelRide(id, userDetails.getUsername(), request.getReason(), request.getReasonText());
        return ResponseEntity.ok(Map.of("message", "Ride cancelled successfully"));
    }

    @GetMapping("/{id}/bookings")
    public ResponseEntity<?> getRideBookings(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        List<PassengerDto> passengers = rideService.getPassengersForRide(id, userDetails.getUsername());
        return ResponseEntity.ok(passengers);
    }
}
