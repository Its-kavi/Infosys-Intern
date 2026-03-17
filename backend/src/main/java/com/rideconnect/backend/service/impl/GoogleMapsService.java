package com.rideconnect.backend.service.impl;

import com.google.maps.DirectionsApi;
import com.google.maps.GeocodingApi;
import com.google.maps.GeoApiContext;
import com.google.maps.model.DirectionsResult;
import com.google.maps.model.GeocodingResult;
import com.google.maps.model.LatLng;
import com.rideconnect.backend.model.RouteDistance;
import com.rideconnect.backend.repository.jpa.RouteDistanceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

@Service
public class GoogleMapsService {

    @Value("${google.maps.api.key}")
    private String apiKey;

    @Autowired
    private RouteDistanceRepository routeDistanceRepository;

    private GeoApiContext getContext() {
        return new GeoApiContext.Builder().apiKey(apiKey).build();
    }

    // 1. Get Coordinates
    @Cacheable(value = "coordinates", key = "#city.trim().toLowerCase()")
    public LatLng getCoordinates(String city) {
        try {
            GeocodingResult[] results = GeocodingApi.newRequest(getContext())
                    .address(city)
                    .await();

            if (results.length > 0) {
                return results[0].geometry.location;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    // 2. OPTIMIZED: Get Both Polyline and Distance in ONE call (with Caching)
    @Cacheable(value = "routes", key = "{#source.trim().toLowerCase(), #destination.trim().toLowerCase()}")
    public Map<String, Object> getRouteDetails(String source, String destination) {
        String src = source.trim().toLowerCase();
        String dest = destination.trim().toLowerCase();

        // Check Cache first
        Optional<RouteDistance> cached = routeDistanceRepository.findBySourceAndDestination(src, dest);
        if (cached.isPresent() && cached.get().getEncodedPolyline() != null) {
            Map<String, Object> details = new HashMap<>();
            details.put("distance", cached.get().getDistanceKm());
            details.put("encodedPolyline", cached.get().getEncodedPolyline());
            // We still need to decode it for JTS LineString if needed by the caller
            details.put("path", new com.google.maps.model.EncodedPolyline(cached.get().getEncodedPolyline()).decodePath());
            return details;
        }

        try {
            DirectionsResult result = DirectionsApi.newRequest(getContext())
                    .origin(source)
                    .destination(destination)
                    .await();

            if (result.routes.length > 0) {
                Map<String, Object> details = new HashMap<>();

                String encodedPath = result.routes[0].overviewPolyline.getEncodedPath();
                double distanceKm = 0.0;

                // Decode Polyline (for JTS/LineString)
                details.put("path", result.routes[0].overviewPolyline.decodePath());

                // Keep raw encoded string (for frontend)
                details.put("encodedPolyline", encodedPath);

                // Get Distance (in KM)
                if (result.routes[0].legs.length > 0) {
                    long distanceMeters = result.routes[0].legs[0].distance.inMeters;
                    distanceKm = distanceMeters / 1000.0;
                    details.put("distance", distanceKm);
                }

                // Save to Cache
                saveToCache(src, dest, distanceKm, encodedPath);

                return details;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    private void saveToCache(String source, String destination, Double distance, String encodedPolyline) {
        try {
            RouteDistance route = routeDistanceRepository.findBySourceAndDestination(source, destination)
                    .orElse(new RouteDistance());
            
            route.setSource(source);
            route.setDestination(destination);
            route.setDistanceKm(distance);
            route.setEncodedPolyline(encodedPolyline);
            
            routeDistanceRepository.save(route);
        } catch (Exception e) {
            System.err.println("Failed to save route to cache: " + e.getMessage());
        }
    }
}
