package com.rideconnect.backend.repository.jpa;

import com.rideconnect.backend.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByRevieweeId(Long userId);

    // Prevent duplicate reviews for the same booking by the same person
    boolean existsByBookingIdAndReviewerEmail(Long bookingId, String email);
}
