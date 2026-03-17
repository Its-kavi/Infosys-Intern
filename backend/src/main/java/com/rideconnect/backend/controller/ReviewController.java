package com.rideconnect.backend.controller;

import com.rideconnect.backend.model.Review;
import com.rideconnect.backend.repository.jpa.ReviewRepository;
import com.rideconnect.backend.service.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private ReviewRepository reviewRepository;

    @PostMapping("/submit")
    public ResponseEntity<?> submitReview(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal UserDetails userDetails) {

        if (request.get("bookingId") == null || request.get("rating") == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "bookingId and rating are required."));
        }

        Long bookingId = Long.valueOf(request.get("bookingId").toString());
        Integer rating = Integer.valueOf(request.get("rating").toString());
        String comment = request.getOrDefault("comment", "").toString();

        Review review = reviewService.submitReview(bookingId, rating, comment, userDetails.getUsername());
        return ResponseEntity.ok(review);
    }

    // GET /api/reviews/user/{userId} -> Get reviews written ABOUT this user
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserReviews(@PathVariable Long userId) {
        return ResponseEntity.ok(reviewRepository.findByRevieweeId(userId));
    }

    // GET /api/reviews/my-reviews -> Get reviews about ME
    @GetMapping("/my-reviews")
    public ResponseEntity<?> getMyReviews(@AuthenticationPrincipal UserDetails userDetails) {
        // You'll need to fetch the User ID from email first via UserService
        // For brevity, assuming you implement a service method `getMyReviews(email)`
        return ResponseEntity.ok(reviewService.getReviewsForUser(userDetails.getUsername()));
    }
}
