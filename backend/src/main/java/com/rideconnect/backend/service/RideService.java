package com.rideconnect.backend.service;

import com.google.maps.model.LatLng;
import com.rideconnect.backend.dto.PassengerDto;
import com.rideconnect.backend.model.Booking;
import com.rideconnect.backend.model.DriverCancelReason;
import com.rideconnect.backend.model.Ride;
import com.rideconnect.backend.model.User;
import com.rideconnect.backend.repository.jpa.BookingRepository;
import com.rideconnect.backend.repository.jpa.RideRepository;
import com.rideconnect.backend.repository.jpa.UserRepository;
import com.rideconnect.backend.repository.spec.RideSpecification;
import com.rideconnect.backend.service.impl.GoogleMapsService;
import com.rideconnect.backend.util.GeometryUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class RideService {

    @Autowired private RideRepository rideRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DistanceService distanceService;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private NotificationService notificationService;
    @Autowired private GoogleMapsService googleMapsService;
    @Autowired private EmailService emailService;
    @Value("${ride.base-fare}")
    private double baseFare;

    @Value("${ride.rate-per-km}")
    private double ratePerKm;

    @Value("${ride.rounding.step}")
    private int roundingStep;

    @Value("${ride.duration.label}")
    private String durationLabel;

    @Value("${ride.status.available}")
    private String statusAvailable;

    @Value("${ride.status.full}")
    private String statusFull;

    @Value("${ride.status.in-progress}")
    private String statusInProgress;

    @Value("${ride.status.completed}")
    private String statusCompleted;

    @Value("${ride.status.cancelled}")
    private String statusCancelled;

    @Value("${ride.status.cancelled-by-admin}")
    private String statusCancelledByAdmin;

    @Value("${ride.status.cancelled-by-driver}")
    private String statusCancelledByDriver;

    @Value("${payment.status.confirmed}")
    private String bookingStatusConfirmed;

    @Value("${payment.status.onboarded}")
    private String bookingStatusOnboarded;

    public Map<String, Object> calculateRideDetails(String source, String destination) {
        // Use optimized service to get distance and route
        Map<String, Object> routeData = googleMapsService.getRouteDetails(source, destination);

        Double distance = 0.0;
        String encodedPolyline = null;
        if (routeData != null) {
            if (routeData.containsKey("distance")) {
                distance = (Double) routeData.get("distance");
            }
            if (routeData.containsKey("encodedPolyline")) {
                encodedPolyline = (String) routeData.get("encodedPolyline");
            }
        }

        if (distance == 0.0) {
            // Fallback to Mock if Google Fails
            distance = distanceService.calculateDistance(source, destination);
        }

        double maxFare = Math.round((baseFare + (distance * ratePerKm)) / roundingStep) * roundingStep;

        return Map.of(
                "distanceKm", distance,
                "suggestedFare", maxFare,
                "duration", String.format(durationLabel, (int) (distance / 60)), // Simple estimation
                "encodedPolyline", encodedPolyline != null ? encodedPolyline : ""
        );
    }

    @CacheEvict(value = "rides", key = "T(org.springframework.cache.interceptor.SimpleKey).EMPTY")
    public Ride postRide(Ride ride, String email) {
        User driver = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        if (!driver.isEmailVerified()) throw new RuntimeException("Please verify your email before posting a ride.");
        if (!driver.isDriver()) throw new RuntimeException("Only drivers can post rides!");

        LocalDate today = LocalDate.now();
        if (ride.getTravelDate().isBefore(today)) throw new RuntimeException("Travel date cannot be in the past!");

        // 1. Geocoding (Coordinates)
        LatLng srcCoords = googleMapsService.getCoordinates(ride.getSource());
        LatLng destCoords = googleMapsService.getCoordinates(ride.getDestination());
        if (srcCoords != null) ride.setSourceLocation(GeometryUtil.createPoint(srcCoords.lat, srcCoords.lng));
        if (destCoords != null) ride.setDestinationLocation(GeometryUtil.createPoint(destCoords.lat, destCoords.lng));

        // 2. OPTIMIZED: Get Route & Distance in ONE call
        Map<String, Object> routeData = googleMapsService.getRouteDetails(ride.getSource(), ride.getDestination());
        Double distance = 0.0;

        if (routeData != null) {
            if (routeData.containsKey("path")) {
                ride.setRoutePath(GeometryUtil.createLineString((List<LatLng>) routeData.get("path")));
            }
            if (routeData.containsKey("encodedPolyline")) {
                ride.setEncodedPolyline((String) routeData.get("encodedPolyline"));
            }
            if (routeData.containsKey("distance")) {
                distance = (Double) routeData.get("distance");
            }
        }

        // Fallback Distance
        if (distance == 0.0) distance = distanceService.calculateDistance(ride.getSource(), ride.getDestination());
        ride.setDistanceKm(distance);

        // 3. Price Validation & Logic
        double maxFare = Math.round((baseFare + (distance * ratePerKm)) / roundingStep) * roundingStep;

        if (ride.getPricePerSeat() != null && ride.getPricePerSeat() > 0) {
            // User provided a price. VALIDATE IT.
            if (ride.getPricePerSeat() > maxFare) {
                throw new RuntimeException("Price cannot exceed the maximum calculated fare of ₹" + maxFare);
            }
        } else {
            // Default to max/dynamic fare
            ride.setPricePerSeat(maxFare);
        }

        ride.setDriver(driver);
        ride.setStatus(statusAvailable);

        return rideRepository.save(ride);
    }
    @Cacheable(value = "rides")
    public List<Ride> getAllRides() { return rideRepository.findAll(); }

    public List<Ride> getMyRides(String email) { return rideRepository.findByDriverEmail(email); }

    // --- UPDATED SEARCH METHOD ---
    @Cacheable(value = "searchRides", key = "{#source, #destination, #date, #minPrice, #maxPrice, #minSeats, #minRating}")
    public List<Ride> searchRides(String source, String destination, LocalDate date,
                                  Double minPrice, Double maxPrice,
                                  Integer minSeats, Double minRating) {

        List<String> activeStatuses = List.of(statusAvailable, statusFull);

        // 1. If NO filters are provided, return ALL Available rides (Browse Mode)
        if ((source == null || source.isEmpty()) &&
                (destination == null || destination.isEmpty()) &&
                date == null) {
            return rideRepository.findAll(RideSpecification.hasStatusIn(activeStatuses));
        }

        // 2. Build Specification for Text Search
        Specification<Ride> spec = RideSpecification.hasStatusIn(activeStatuses);
        if (source != null && !source.isEmpty()) spec = spec.and(RideSpecification.hasSource(source));
        if (destination != null && !destination.isEmpty()) spec = spec.and(RideSpecification.hasDestination(destination));
        if (date != null) spec = spec.and(RideSpecification.hasDate(date));
        if (minPrice != null) spec = spec.and(RideSpecification.priceBetween(minPrice, maxPrice));
        if (minSeats != null) spec = spec.and(RideSpecification.minSeats(minSeats));

        List<Ride> textResults = rideRepository.findAll(spec);

        // 3. Fallback to Spatial Search
        if (textResults.isEmpty() && source != null && destination != null) {
            try {
                LatLng start = googleMapsService.getCoordinates(source);
                LatLng end = googleMapsService.getCoordinates(destination);

                if (start != null && end != null) {
                    return rideRepository.findSmartRouteMatches(
                            date, start.lat, start.lng, end.lat, end.lng
                    );
                }
            } catch (Exception e) {
                System.err.println("Spatial Search Error: " + e.getMessage());
            }
        }

        return textResults;
    }

    @Transactional
    @CacheEvict(value = "rides", key = "T(org.springframework.cache.interceptor.SimpleKey).EMPTY")
    public void cancelRide(Long rideId, String driverEmail, String reason, boolean isAdmin) {
        Ride ride = rideRepository.findById(rideId).orElseThrow(() -> new RuntimeException("Ride not found"));
        
        if (!isAdmin && !ride.getDriver().getEmail().equals(driverEmail)) {
            throw new RuntimeException("Not authorized");
        }

        ride.setStatus(isAdmin ? statusCancelledByAdmin : statusCancelled);
        if (reason != null) {
            ride.setCancellationReason(reason);
        }
        rideRepository.save(ride);

        List<Booking> bookings = bookingRepository.findByRideId(rideId);
        for (Booking b : bookings) {
            if (!b.getStatus().startsWith(statusCancelled)) {
                b.setStatus(isAdmin ? statusCancelledByAdmin : statusCancelledByDriver);
                bookingRepository.save(b);

                emailService.sendRideCancellation(
                        b.getPassenger().getEmail(),
                        b.getPassenger().getName(),
                        ride.getSource(),
                        ride.getDestination()
                );

                String msg = isAdmin ? "Ride cancelled by admin: " + reason : "Ride cancelled by driver.";
                notificationService.notifyUser(b.getPassenger().getEmail(), "Ride Cancelled", msg, "WARNING");
            }
        }
    }

    @Transactional
    public void cancelRide(Long rideId, String driverEmail) {
        cancelRide(rideId, driverEmail, null, false);
    }

    @Transactional
    public void cancelRide(Long rideId, String driverEmail, DriverCancelReason reason, String reasonText) {
        String resolvedReason = resolveDriverCancelReasonText(reason, reasonText);
        cancelRide(rideId, driverEmail, resolvedReason, false);
    }

    @Transactional
    @CacheEvict(value = "rides", key = "T(org.springframework.cache.interceptor.SimpleKey).EMPTY")
    public void startRide(Long rideId, String driverEmail) {
        Ride ride = rideRepository.findById(rideId).orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getEmail().equals(driverEmail)) {
            throw new RuntimeException("Not authorized to start this ride");
        }

        // Only allow starting if status is valid
        if (!statusAvailable.equals(ride.getStatus()) && !statusFull.equals(ride.getStatus())) {
            throw new RuntimeException("Ride cannot be started. Current status: " + ride.getStatus());
        }

        ride.setStatus(statusInProgress);
        rideRepository.save(ride);

        // Notify Passengers
        List<Booking> bookings = bookingRepository.findByRideId(rideId);
        for (Booking b : bookings) {
            if (bookingStatusConfirmed.equals(b.getStatus()) || bookingStatusOnboarded.equals(b.getStatus())) {
                notificationService.notifyUser(b.getPassenger().getEmail(), "Ride Started",
                        "Your driver has started the trip!", "INFO");
            }
        }
    }

    @Transactional
    @CacheEvict(value = "rides", key = "T(org.springframework.cache.interceptor.SimpleKey).EMPTY")
    public void completeRide(Long rideId, String driverEmail) {
        Ride ride = rideRepository.findById(rideId).orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getEmail().equals(driverEmail)) {
            throw new RuntimeException("Not authorized to complete this ride");
        }

        if (statusCompleted.equals(ride.getStatus())) {
            throw new RuntimeException("Ride is already completed");
        }

        ride.setStatus(statusCompleted);
        rideRepository.save(ride);

        // Notify Passengers
        List<Booking> bookings = bookingRepository.findByRideId(rideId);
        for (Booking b : bookings) {
            if (bookingStatusConfirmed.equals(b.getStatus())) {
                notificationService.notifyUser(b.getPassenger().getEmail(), "Ride Completed",
                        "You have reached your destination. Please rate your driver!", "SUCCESS");

                emailService.sendReviewRequest(
                        b.getPassenger().getEmail(),
                        b.getPassenger().getName(),
                        ride.getDriver().getName()
                );
            }
        }
    }

    public List<PassengerDto> getPassengersForRide(Long rideId, String driverEmail) {
        Ride ride = rideRepository.findById(rideId).orElseThrow(() -> new RuntimeException("Ride not found"));
        if (!ride.getDriver().getEmail().equals(driverEmail)) throw new RuntimeException("Not authorized");

        List<Booking> bookings = bookingRepository.findByRideId(rideId);
        List<PassengerDto> list = new ArrayList<>();
        for (Booking b : bookings) {
            if (!b.getStatus().equals(statusCancelled)) {
                User p = b.getPassenger();
                list.add(PassengerDto.builder()
                        .bookingId(b.getId()) // Added ID here
                        .name(p.getName())
                        .phone(p.getPhone())
                        .email(p.getEmail())
                        .seatsBooked(b.getSeatsBooked())
                        .bookingStatus(b.getStatus())
                        .userId(p.getId())
                        .profilePictureUrl(p.getProfilePictureUrl())
                        .bio(p.getBio())
                        .build());
            }
        }
        return list;
    }

    private String resolveDriverCancelReasonText(DriverCancelReason reason, String reasonText) {
        if (reason == null) {
            throw new RuntimeException("Cancellation reason is required");
        }
        return switch (reason) {
            case UNPROFITABLE_DESTINATION -> "Unprofitable or traffic-heavy destination";
            case VEHICLE_ISSUES -> "Vehicle issues";
            case OTHER -> {
                if (reasonText == null || reasonText.trim().isEmpty()) {
                    throw new RuntimeException("Reason description is required for OTHER");
                }
                yield reasonText.trim();
            }
        };
    }
}
