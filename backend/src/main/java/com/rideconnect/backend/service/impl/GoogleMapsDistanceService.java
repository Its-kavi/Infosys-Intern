package com.rideconnect.backend.service.impl;

import com.google.maps.DistanceMatrixApi;
import com.google.maps.GeoApiContext;
import com.google.maps.model.DistanceMatrix;
import com.google.maps.model.DistanceMatrixElement;
import com.google.maps.model.DistanceMatrixRow;
import com.google.maps.model.TravelMode;
import com.rideconnect.backend.service.DistanceService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

@Service
@Component("googleMapsDistanceService")
public class GoogleMapsDistanceService implements DistanceService {

    @Value("${google.maps.api.key}")
    private String apiKey;

    @Override
    public double calculateDistance(String source, String destination) {
        try {
            // 1. Initialize Context
            GeoApiContext context = new GeoApiContext.Builder()
                    .apiKey(apiKey)
                    .build();

            // 2. Call Google Maps Distance Matrix API
            DistanceMatrix result = DistanceMatrixApi.newRequest(context)
                    .origins(source)
                    .destinations(destination)
                    .mode(TravelMode.DRIVING)
                    .await();

            // 3. Extract the distance
            if (result.rows.length > 0) {
                DistanceMatrixRow row = result.rows[0];
                if (row.elements.length > 0) {
                    DistanceMatrixElement element = row.elements[0];

                    if (element.status.toString().equals("OK")) {
                        // Google returns distance in meters (e.g., 345000 meters)
                        long distanceInMeters = element.distance.inMeters;

                        // Convert to KM (e.g., 345.0 km)
                        return distanceInMeters / 1000.0;
                    }
                }
            }

            throw new RuntimeException("Google Maps could not find a route between " + source + " and " + destination);

        } catch (Exception e) {
            // Fallback or Log Error
            e.printStackTrace();
            throw new RuntimeException("Error calculating distance: " + e.getMessage());
        }
    }
}
