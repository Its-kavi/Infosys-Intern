package com.rideconnect.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.Point;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(
        name = "rides",
        indexes = {
                @Index(name = "idx_rides_driver_id", columnList = "driver_id"),
                @Index(name = "idx_rides_status", columnList = "status"),
                @Index(name = "idx_rides_travel_date", columnList = "travel_date"),
                @Index(name = "idx_rides_status_travel_date", columnList = "status,travel_date")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private String destination;

    private String stopovers;

    @Column(nullable = false)
    private LocalDate travelDate;

    @Column(nullable = false)
    private LocalTime travelTime;

    @Column(nullable = false)
    private Double pricePerSeat;

    @Column(nullable = false)
    private Integer availableSeats;

    private String status;

    private Double distanceKm;

    private String cancellationReason;

    @Column(columnDefinition = "geometry(Point, 4326)")
    @JsonIgnore // Don't send complex geometry to frontend list
    private Point sourceLocation;

    // Store exact end point
    @Column(columnDefinition = "geometry(Point, 4326)")
    @JsonIgnore
    private Point destinationLocation;

    // Store the full path
    @Column(columnDefinition = "geometry(LineString, 4326)")
    @JsonIgnore
    private LineString routePath;

    @Column(columnDefinition = "TEXT")
    private String encodedPolyline;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "driver_id", nullable = false)
    @JsonIgnoreProperties({"password", "roles", "authorities"})
    private User driver;
}
