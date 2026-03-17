package com.rideconnect.backend.repository.jpa;

import com.rideconnect.backend.model.RouteDistance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RouteDistanceRepository extends JpaRepository<RouteDistance, Long> {
    // Find cached distance (Case insensitive ideally, but exact match for now)
    Optional<RouteDistance> findBySourceAndDestination(String source, String destination);
}
