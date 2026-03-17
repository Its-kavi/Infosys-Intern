package com.rideconnect.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RoutePresetDto {
    private String source;
    private String destination;
    private Long frequency;
}
