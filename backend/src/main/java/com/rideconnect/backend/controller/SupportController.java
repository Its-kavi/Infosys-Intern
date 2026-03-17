package com.rideconnect.backend.controller;

import com.rideconnect.backend.dto.SupportRequestCreateRequest;
import com.rideconnect.backend.dto.SupportRequestResponse;
import com.rideconnect.backend.model.CustomerSupportRequest;
import com.rideconnect.backend.repository.jpa.UserRepository;
import com.rideconnect.backend.service.CustomerSupportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/support")
public class SupportController {

    @Autowired
    private CustomerSupportService customerSupportService;

    @Autowired
    private UserRepository userRepository;

    @PreAuthorize("hasRole('PASSENGER')")
    @PostMapping("/requests")
    public SupportRequestResponse createRequest(
            @RequestBody SupportRequestCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (request == null || request.getBookingId() == null) {
            throw new RuntimeException("Booking ID is required");
        }
        CustomerSupportRequest created = customerSupportService.create(
                request.getBookingId(),
                userDetails.getUsername(),
                request.getIssueDescription(),
                request.getRefundRequested(),
                request.getEvidenceUrls()
        );
        return toResponse(created);
    }

    @PreAuthorize("hasRole('PASSENGER')")
    @GetMapping("/requests/my")
    public List<SupportRequestResponse> getMyRequests(@AuthenticationPrincipal UserDetails userDetails) {
        Long passengerId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"))
                .getId();
        return customerSupportService.getMyRequests(passengerId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private SupportRequestResponse toResponse(CustomerSupportRequest request) {
        return SupportRequestResponse.builder()
                .id(request.getId())
                .bookingId(request.getBooking() != null ? request.getBooking().getId() : null)
                .rideId(request.getRide() != null ? request.getRide().getId() : null)
                .passengerId(request.getPassenger() != null ? request.getPassenger().getId() : null)
                .passengerName(request.getPassenger() != null ? request.getPassenger().getName() : null)
                .passengerEmail(request.getPassenger() != null ? request.getPassenger().getEmail() : null)
                .driverId(request.getDriver() != null ? request.getDriver().getId() : null)
                .driverName(request.getDriver() != null ? request.getDriver().getName() : null)
                .driverEmail(request.getDriver() != null ? request.getDriver().getEmail() : null)
                .rideSource(request.getRideSource())
                .rideDestination(request.getRideDestination())
                .rideDate(request.getRideDate())
                .rideTime(request.getRideTime())
                .issueDescription(request.getIssueDescription())
                .refundRequested(request.getRefundRequested())
                .evidenceUrls(request.getEvidenceUrls())
                .status(request.getStatus())
                .adminNotes(request.getAdminNotes())
                .adminId(request.getAdminId())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }
}
