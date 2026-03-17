package com.rideconnect.backend.repository.jpa;

import com.rideconnect.backend.model.Ride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface RideRepository extends JpaRepository<Ride, Long>, JpaSpecificationExecutor<Ride> {

    List<Ride> findByDriverEmail(String email);

    long countByStatus(String status);

    @Query("SELECT COUNT(r) FROM Ride r WHERE r.status LIKE 'CANCELLED%'")
    long countCancelledRides();

    // --- LEVEL 3.5: DYNAMIC SMART ROUTE MATCHING ---
    // LOGIC:
    // 1. Calculate Dynamic Buffer: 10% of total distance.
    // 2. Clamp Buffer: Min 5km (5000m), Max 30km (30000m).
    // 3. Check if Passenger Start/End is within this dynamic buffer.

    @Query(value = """
            SELECT * FROM rides r
            WHERE r.status = 'AVAILABLE'
            AND (cast(:date as date) IS NULL OR r.travel_date = :date)
            AND r.route_path IS NOT NULL

            -- Dynamic Buffer Logic for Start Point
            AND ST_DWithin(
                r.route_path::geography,
                ST_SetSRID(ST_MakePoint(:startLng, :startLat), 4326)::geography,
                GREATEST(5000, LEAST(20000, (r.distance_km * 1000) * 0.10))
            )

            -- Dynamic Buffer Logic for End Point
            AND ST_DWithin(
                r.route_path::geography,
                ST_SetSRID(ST_MakePoint(:endLng, :endLat), 4326)::geography,
                GREATEST(5000, LEAST(20000, (r.distance_km * 1000) * 0.10))
            )

            -- Direction Check (Start comes before End)
            AND ST_LineLocatePoint(r.route_path, ST_SetSRID(ST_MakePoint(:startLng, :startLat), 4326)) <
                ST_LineLocatePoint(r.route_path, ST_SetSRID(ST_MakePoint(:endLng, :endLat), 4326))
            """, nativeQuery = true)
    List<Ride> findSmartRouteMatches(
            @Param("date") LocalDate date,
            @Param("startLat") double startLat,
            @Param("startLng") double startLng,
            @Param("endLat") double endLat,
            @Param("endLng") double endLng);
}
