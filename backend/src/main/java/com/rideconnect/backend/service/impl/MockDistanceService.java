package com.rideconnect.backend.service.impl;

import com.rideconnect.backend.service.DistanceService;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import java.util.Random;

@Service
@Component("mockDistanceService")
public class MockDistanceService implements DistanceService {

    @Value("${mock.distance.min}")
    private int minDistance;

    @Value("${mock.distance.range}")
    private int distanceRange;

    @Override
    public double calculateDistance(String source, String destination) {

        // Use hash codes so the "random" number is consistent for the same cities
        // (e.g., Chennai->Bangalore will always return the same fake distance)
        long seed = source.hashCode() + destination.hashCode();
        Random random = new Random(seed);

        return minDistance + (distanceRange * random.nextDouble());
    }
}
