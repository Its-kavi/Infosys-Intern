package com.rideconnect.backend.repository.spec;

import com.rideconnect.backend.model.Ride;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public class RideSpecification {

    public static Specification<Ride> hasStatus(String status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    public static Specification<Ride> hasStatusIn(java.util.Collection<String> statuses) {
        return (root, query, cb) -> root.get("status").in(statuses);
    }

    public static Specification<Ride> hasSource(String source) {
        return (root, query, cb) -> {
            if (source == null || source.isEmpty()) return null;
            String searchPattern = "%" + source.toLowerCase() + "%";
            // Check if source matches OR if stopovers contain the source
            return cb.or(
                    cb.like(cb.lower(root.get("source")), searchPattern),
                    cb.like(cb.lower(root.get("stopovers")), searchPattern)
            );
        };
    }

    public static Specification<Ride> hasDestination(String destination) {
        return (root, query, cb) -> {
            if (destination == null || destination.isEmpty()) return null;
            String searchPattern = "%" + destination.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("destination")), searchPattern),
                    cb.like(cb.lower(root.get("stopovers")), searchPattern)
            );
        };
    }

    public static Specification<Ride> hasDate(LocalDate date) {
        return (root, query, cb) -> {
            if (date == null) return null;
            return cb.equal(root.get("travelDate"), date);
        };
    }

    public static Specification<Ride> priceBetween(Double min, Double max) {
        return (root, query, cb) -> {
            if (min == null && max == null) return null;
            if (min != null && max != null) return cb.between(root.get("pricePerSeat"), min, max);
            if (min != null) return cb.greaterThanOrEqualTo(root.get("pricePerSeat"), min);
            return cb.lessThanOrEqualTo(root.get("pricePerSeat"), max);
        };
    }

    public static Specification<Ride> minSeats(Integer seats) {
        return (root, query, cb) -> {
            if (seats == null) return null;
            return cb.greaterThanOrEqualTo(root.get("availableSeats"), seats);
        };
    }
}
