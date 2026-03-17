package com.rideconnect.backend.controller;

import com.rideconnect.backend.dto.SupportRequestResponse;
import com.rideconnect.backend.dto.SupportRequestUpdateRequest;
import com.rideconnect.backend.model.Booking;
import com.rideconnect.backend.model.SupportStatus;
import com.rideconnect.backend.model.User;
import com.rideconnect.backend.repository.jpa.BookingRepository;
import com.rideconnect.backend.repository.jpa.PaymentRepository;
import com.rideconnect.backend.repository.jpa.RideRepository;
import com.rideconnect.backend.repository.jpa.UserRepository;
import com.rideconnect.backend.service.NotificationService;
import com.rideconnect.backend.service.CustomerSupportService;
import com.rideconnect.backend.service.RideService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private RideRepository rideRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private RideService rideService;

    @Autowired
    private CustomerSupportService customerSupportService;

    @Value("${ride.status.available}")
    private String statusAvailable;

    @Value("${ride.status.completed}")
    private String statusCompleted;

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/bookings")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    @GetMapping("/rides")
    @PreAuthorize("hasRole('ADMIN')")
    public List<com.rideconnect.backend.model.Ride> getAllRides() {
        return rideRepository.findAll();
    }

    @PutMapping("/verify-driver/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> verifyDriver(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            user.setVerified(true);
            userRepository.save(user);

            // 🔔 NOTIFY DRIVER
            notificationService.notifyUser(user.getEmail(), "Account Verified",
                    "You can now post rides!", "SUCCESS");

            return ResponseEntity.ok(Map.of("message", "User verified successfully: " + user.getName()));
        }).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PutMapping("/users/{id}/block")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> blockUser(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            user.setActive(false);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "User blocked successfully."));
        }).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PutMapping("/rides/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> cancelRide(@PathVariable Long id, @RequestBody Map<String, String> request) {
        String reason = request.get("reason");
        rideService.cancelRide(id, null, reason, true);
        return ResponseEntity.ok(Map.of("message", "Ride cancelled successfully. Reason logged."));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getDashboardStats() {
        long totalUsers = userRepository.count();
        long activeRides = rideRepository.countByStatus(statusAvailable);
        long completedRides = rideRepository.countByStatus(statusCompleted);
        long cancelledRides = rideRepository.countCancelledRides();
        Double totalRevenue = paymentRepository.calculateTotalRevenue();

        return ResponseEntity.ok(Map.of(
                "totalUsers", totalUsers,
                "activeRides", activeRides,
                "completedRides", completedRides,
                "cancelledRides", cancelledRides,
                "totalRevenue", totalRevenue
        ));
    }

    @GetMapping("/support-requests")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getSupportRequests(
            @RequestParam(required = false) SupportStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SupportRequestResponse> result = customerSupportService
                .listRequests(status, PageRequest.of(page, size))
                .map(this::toSupportResponse);

        return ResponseEntity.ok(Map.of(
                "items", result.getContent(),
                "totalElements", result.getTotalElements(),
                "totalPages", result.getTotalPages()
        ));
    }

    @PutMapping("/support-requests/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateSupportRequest(
            @PathVariable Long id,
            @RequestBody SupportRequestUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long adminId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Admin not found"))
                .getId();
        return ResponseEntity.ok(toSupportResponse(
                customerSupportService.updateStatus(id, request.getStatus(), request.getAdminNotes(), adminId)
        ));
    }

    private SupportRequestResponse toSupportResponse(com.rideconnect.backend.model.CustomerSupportRequest request) {
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
