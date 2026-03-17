package com.rideconnect.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "route_distances", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"source", "destination"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteDistance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private String destination;

    @Column(nullable = false)
    private Double distanceKm;

    @Column(columnDefinition = "TEXT")
    private String encodedPolyline;
}
