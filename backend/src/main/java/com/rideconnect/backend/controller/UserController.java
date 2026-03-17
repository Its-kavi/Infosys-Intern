package com.rideconnect.backend.controller;

import com.rideconnect.backend.dto.UpdateProfileRequest;
import com.rideconnect.backend.model.Role;
import com.rideconnect.backend.model.User;
import com.rideconnect.backend.repository.jpa.ReviewRepository;
import com.rideconnect.backend.repository.jpa.UserRepository;
import com.rideconnect.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    @GetMapping("/profile")
    public ResponseEntity<User> getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.findByEmail(userDetails.getUsername());
        return ResponseEntity.ok(user);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User updatedUser = userService.updateProfile(userDetails.getUsername(), request);
        return ResponseEntity.ok(updatedUser);
    }

    @PostMapping("/unsubscribe")
    public ResponseEntity<?> unsubscribe(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.findByEmail(userDetails.getUsername());
        user.setEmailOptOut(true);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "You have successfully unsubscribed from non-essential emails."));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserPublicProfile(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            Map<String, Object> profile = new HashMap<>();

            // Safe Public Data
            profile.put("id", user.getId());
            profile.put("name", user.getName());
            profile.put("role", user.getRole());
            profile.put("profilePictureUrl", user.getProfilePictureUrl());
            profile.put("bio", user.getBio());
            profile.put("averageRating", user.getAverageRating());
            profile.put("totalReviews", user.getTotalReviews());
            profile.put("phone", user.getPhone()); // Needed for contact
            profile.put("memberSince", user.getMemberSince()); // Month Year info

            // Include reviews with simplified reviewer info
            List<Map<String, Object>> reviews = reviewRepository.findByRevieweeId(user.getId()).stream()
                    .map(review -> {
                        Map<String, Object> r = new HashMap<>();
                        r.put("id", review.getId());
                        r.put("rating", review.getRating());
                        r.put("comment", review.getComment());
                        r.put("createdAt", review.getCreatedAt());
                        r.put("reviewerName", review.getReviewer().getName());
                        r.put("reviewerImage", review.getReviewer().getProfilePictureUrl());
                        return r;
                    }).collect(Collectors.toList());

            profile.put("reviews", reviews);

            // Extra data for Drivers
            if (user.getRole() == Role.DRIVER) {
                profile.put("vehicleModel", user.getVehicleModel());
                profile.put("carImageUrl", user.getCarImageUrl());
                profile.put("carFeatures", user.getCarFeatures());
            }

            return ResponseEntity.ok(profile);
        }).orElse(ResponseEntity.notFound().build());
    }
}
