package com.rideconnect.backend.service.impl;

import com.rideconnect.backend.model.RouteDistance;
import com.rideconnect.backend.repository.jpa.RouteDistanceRepository;
import com.rideconnect.backend.service.DistanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@Primary // Use THIS service by default in RideService
public class SmartDistanceService implements DistanceService {

    @Autowired
    private RouteDistanceRepository routeRepository;

    @Qualifier("googleMapsDistanceService")
    @Autowired
    // Inject the Real Google Maps Service (we wrote this earlier)
    // Make sure you REMOVED @Primary from GoogleMapsDistanceService
    private GoogleMapsDistanceService googleMapsService;

    @Qualifier("mockDistanceService")
    @Autowired
    // Inject the Mock Service (we wrote this earlier)
    private MockDistanceService mockService;

    @Override
    public double calculateDistance(String source, String destination) {
        // 1. CLEANUP: Standardize inputs (e.g., lowercase, trim) to improve cache hits
        String src = source.trim().toLowerCase();
        String dest = destination.trim().toLowerCase();

        // 2. CACHE CHECK: Do we already have this?
        Optional<RouteDistance> cachedRoute = routeRepository.findBySourceAndDestination(src, dest);
        if (cachedRoute.isPresent()) {
            System.out.println("✅ CACHE HIT: Found distance for " + src + " -> " + dest);
            return cachedRoute.get().getDistanceKm();
        }

        // 3. API CALL: Try Google Maps
        try {
            System.out.println("🌍 CALLING GOOGLE MAPS API...");
            double distance = googleMapsService.calculateDistance(source, destination);

            // 4. SAVE TO CACHE: Save it so we don't pay next time
            saveToCache(src, dest, distance);

            return distance;

        } catch (Exception e) {
            // 5. FALLBACK: If API key fails, quota exceeded, or network error
            System.err.println("❌ GOOGLE MAPS FAILED: " + e.getMessage());
            System.out.println("⚠️ FALLING BACK TO MOCK SERVICE");

            double mockDistance = mockService.calculateDistance(source, destination);
            // Optional: You might NOT want to cache the mock distance, or flag it as 'estimated'
            return mockDistance;
        }
    }

    private void saveToCache(String source, String destination, Double distance) {
        try {
            RouteDistance route = RouteDistance.builder()
                    .source(source)
                    .destination(destination)
                    .distanceKm(distance)
                    .build();
            routeRepository.save(route);
        } catch (Exception e) {
            System.err.println("Failed to save to cache (duplicate entry?): " + e.getMessage());
        }
    }
}
