package com.rideconnect.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class NotificationDto {
    private String title;
    private String message;
    private String type; // e.g., "SUCCESS", "WARNING", "INFO"
    private String timestamp;
    private Integer unreadCount;
}
