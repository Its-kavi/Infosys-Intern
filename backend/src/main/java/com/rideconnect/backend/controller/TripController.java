package com.rideconnect.backend.controller;

import com.rideconnect.backend.dto.PassengerDto;
import com.rideconnect.backend.service.RideService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/trips")
public class TripController {

    @Autowired
    private RideService rideService;

    @GetMapping("/{id}/participants")
    public ResponseEntity<?> getTripParticipants(@PathVariable Long id,
                                                 @AuthenticationPrincipal UserDetails userDetails) {
        List<PassengerDto> passengers = rideService.getPassengersForRide(id, userDetails.getUsername());
        return ResponseEntity.ok(passengers);
    }
}
