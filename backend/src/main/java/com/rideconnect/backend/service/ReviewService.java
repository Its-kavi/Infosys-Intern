package com.rideconnect.backend.service;

import com.rideconnect.backend.model.Booking;
import com.rideconnect.backend.model.Review;
import com.rideconnect.backend.model.User;
import com.rideconnect.backend.repository.jpa.BookingRepository;
import com.rideconnect.backend.repository.jpa.ReviewRepository;
import com.rideconnect.backend.repository.jpa.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReviewService {

    @Autowired private ReviewRepository reviewRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private NotificationService notificationService;
    @Autowired private org.springframework.cache.CacheManager cacheManager;

    @Value("${ride.status.completed}")
    private String rideStatusCompleted;

    @Transactional
    public Review submitReview(Long bookingId, Integer rating, String comment, String reviewerEmail) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        // 1. Validation
        if (!rideStatusCompleted.equals(booking.getRide().getStatus())) {
            throw new RuntimeException("Ride must be completed before reviewing.");
        }
        if (reviewRepository.existsByBookingIdAndReviewerEmail(bookingId, reviewerEmail)) {
            throw new RuntimeException("You have already reviewed this ride.");
        }
        if (rating < 1 || rating > 5) {
            throw new RuntimeException("Rating must be between 1 and 5.");
        }

        // 2. Identify Roles
        User reviewer = userRepository.findByEmail(reviewerEmail).orElseThrow();
        User reviewee;
        String roleType;

        if (booking.getPassenger().getEmail().equals(reviewerEmail)) {
            // Passenger is reviewing Driver
            reviewee = booking.getRide().getDriver();
            roleType = "Driver";
        } else if (booking.getRide().getDriver().getEmail().equals(reviewerEmail)) {
            // Driver is reviewing Passenger
            reviewee = booking.getPassenger();
            roleType = "Passenger";
        } else {
            throw new RuntimeException("You are not part of this booking.");
        }

        // 3. Save Review
        Review review = Review.builder()
                .booking(booking)
                .reviewer(reviewer)
                .reviewee(reviewee)
                .rating(rating)
                .comment(comment)
                .createdAt(LocalDateTime.now())
                .build();

        reviewRepository.save(review);

        // 4. Update Average Rating
        updateUserRating(reviewee, rating);

        // Evict Cache
        if (cacheManager.getCache("userReviews") != null) {
            cacheManager.getCache("userReviews").evict(reviewee.getEmail());
        }

        // 5. Notify
        notificationService.notifyUser(reviewee.getEmail(), "New Review",
                "You received a " + rating + "-star rating from " + reviewer.getName(), "INFO");

        return review;
    }

    private void updateUserRating(User user, Integer newRating) {
        Double currentAvg = user.getAverageRating() != null ? user.getAverageRating() : 0.0;
        Integer total = user.getTotalReviews() != null ? user.getTotalReviews() : 0;

        // Cumulative Average Formula
        Double newAvg = ((currentAvg * total) + newRating) / (total + 1);

        user.setAverageRating(Math.round(newAvg * 10.0) / 10.0); // 1 decimal
        user.setTotalReviews(total + 1);

        userRepository.save(user);
    }

    @Cacheable(value = "userReviews", key = "#email")
    public List<Review> getReviewsForUser(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return reviewRepository.findByRevieweeId(user.getId());
    }
}
