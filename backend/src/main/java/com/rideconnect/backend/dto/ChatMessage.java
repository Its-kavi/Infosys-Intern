package com.rideconnect.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChatMessage {
    private Long id;
    private String content;
    private String senderId;
    private String recipientId; // The ID of the driver or passenger
    private String tripId; // Optional: to associate chat with a specific ride
    private LocalDateTime timestamp;
}
