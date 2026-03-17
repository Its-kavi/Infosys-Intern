package com.rideconnect.backend.service;

import com.rideconnect.backend.model.Ride;
import com.rideconnect.backend.model.ChatMessage;
import com.rideconnect.backend.repository.jpa.ChatMessageRepository;
import com.rideconnect.backend.repository.jpa.RideRepository;
import com.rideconnect.backend.repository.jpa.BookingRepository;
import com.rideconnect.backend.repository.jpa.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository repository;
    private final SimpMessagingTemplate messagingTemplate;
    private final RideRepository rideRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    
    @Value("${ws.chat.private-queue:/queue/messages}")
    private String chatPrivateQueue = "/queue/messages";

    @Value("${ride.status.completed}")
    private String rideStatusCompleted;

    @Value("${ride.status.cancelled}")
    private String rideStatusCancelledPrefix;

    @Value("${payment.status.cancelled}")
   private String bookingStatusCancelled = "CANCELLED";

    @Transactional
    public void processMessage(ChatMessage chatDto) {
        Long rideId = Long.parseLong(chatDto.getTripId());
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));
    if ("COMPLETED".equals(ride.getStatus())) {
    throw new AccessDeniedException("Chat is closed for completed rides.");
        }

        if (ride.getStatus() != null && ride.getStatus().startsWith("CANCELLED")) {
    throw new AccessDeniedException("Chat is closed for cancelled rides.");
        }

         boolean isDriver = chatDto.getSenderId().equals(ride.getDriver().getId().toString());

        // 1. Save to PostgreSQL
        ChatMessage message = ChatMessage.builder()
                .tripId(chatDto.getTripId())
                .senderId(chatDto.getSenderId())
                .recipientId(chatDto.getRecipientId())
                .content(chatDto.getContent())
                .build();

        ChatMessage savedMessage = repository.save(message);

        // 2. Convert to DTO with timestamp
        ChatMessage responseDto = convertToDto(savedMessage);

        // FIX: Handle both email and numeric ID formats
        String recipientEmail = convertToEmail(chatDto.getRecipientId());
        String senderEmail = convertToEmail(chatDto.getSenderId());

        // 3. Push to the Recipient's Queue using EMAIL (WebSocket principal)
        messagingTemplate.convertAndSendToUser(
        recipientEmail,
        chatPrivateQueue,
        responseDto);

        if (!senderEmail.equals(recipientEmail)) {
          messagingTemplate.convertAndSendToUser(
            senderEmail,
            chatPrivateQueue,
            responseDto);
        }
    }

    /**
     * Convert user identifier to email.
     * Handles both email strings and numeric IDs.
     */
    private String convertToEmail(String userIdentifier) {
        // Check if it's already an email (contains @)
        if (userIdentifier.contains("@")) {
            return userIdentifier;
        }

        // Otherwise, treat it as a numeric ID and lookup the email
        try {
            Long userId = Long.parseLong(userIdentifier);
            return userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + userIdentifier))
                    .getEmail();
        } catch (NumberFormatException e) {
            throw new RuntimeException("Invalid user identifier format: " + userIdentifier);
        }
    }

    public List<ChatMessage> getChatHistory(String tripId, Long currentUserId) {
        // 1. Fetch the Ride/Trip details from your Ride Service
        Long rideId = Long.parseLong(tripId);
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        // 2. SECURITY: Verify the requester is actually part of this ride

         boolean isDriver = currentUserId.equals(ride.getDriver().getId());

        // Efficient DB check instead of loading all bookings
            boolean isPassenger = bookingRepository.findAll().stream()
    .anyMatch(booking ->
        booking.getRide().getId().equals(rideId) &&
        booking.getPassenger().getId().equals(currentUserId) &&
        !bookingStatusCancelled.equals(booking.getStatus())
    );

            if (!isDriver && !isPassenger) {
                throw new AccessDeniedException("You are not authorized to view this chat.");
                }

        // 3. Return messages only if authorized
        List<com.rideconnect.backend.model.ChatMessage> messages = repository.findByTripIdOrderByTimestampAsc(tripId);
        return messages.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private ChatMessage convertToDto(com.rideconnect.backend.model.ChatMessage message) {
        ChatMessage dto = new ChatMessage();
        dto.setId(message.getId());
        dto.setTripId(message.getTripId());
        dto.setSenderId(message.getSenderId());
        dto.setRecipientId(message.getRecipientId());
        dto.setContent(message.getContent());
        dto.setTimestamp(message.getTimestamp());
        return dto;
    }
}
