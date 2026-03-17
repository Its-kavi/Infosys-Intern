package com.rideconnect.backend.service;

import com.rideconnect.backend.model.ChatMessage;
import com.rideconnect.backend.model.Booking;
import com.rideconnect.backend.model.Ride;
import com.rideconnect.backend.model.User;
import com.rideconnect.backend.repository.jpa.BookingRepository;
import com.rideconnect.backend.repository.jpa.ChatMessageRepository;
import com.rideconnect.backend.repository.jpa.RideRepository;
import com.rideconnect.backend.repository.jpa.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive test suite for ChatService
 * Tests message processing, chat history retrieval, and security validations
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ChatService Tests")
class ChatServiceTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private RideRepository rideRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ChatService chatService;

    private User driver;
    private User passenger;
    private Ride ride;
    private Booking booking;
    private ChatMessage chatMessageDto;
    private ChatMessage chatMessageEntity;

    @BeforeEach
    void setUp() {
        // Setup test data
        driver = User.builder()
                .id(1L)
                .name("John Driver")
                .email("driver@test.com")
                .phone("1234567890")
                .build();

        passenger = User.builder()
                .id(2L)
                .name("Jane Passenger")
                .email("passenger@test.com")
                .phone("0987654321")
                .build();

        ride = Ride.builder()
                .id(100L)
                .driver(driver)
                .source("Location A")
                .destination("Location B")
                .availableSeats(3)
                .status("ACTIVE")
                .build();

        booking = Booking.builder()
                .id(1L)
                .ride(ride)
                .passenger(passenger)
                .seatsBooked(1)
                .status("CONFIRMED")
                .build();

        chatMessageDto = ChatMessage.builder()
                .tripId("100")
                .senderId("1")
                .recipientId("2")
                .content("Hello, are you on your way?")
                .build();

        chatMessageEntity = ChatMessage.builder()
                .id(1L)
                .tripId("100")
                .senderId("1")
                .recipientId("2")
                .content("Hello, are you on your way?")
                .timestamp(LocalDateTime.now())
                .build();

    }

    // ==================== PROCESS MESSAGE TESTS ====================

    @Test
    @DisplayName("Should successfully process and save chat message")
    void testProcessMessage_Success() {
        // Arrange
        stubRideLookup();
        stubUserLookup();
        when(chatMessageRepository.save(any(ChatMessage.class)))
                .thenReturn(chatMessageEntity);

        // Act
        chatService.processMessage(chatMessageDto);

        // Assert
        // Verify message was saved to database
        ArgumentCaptor<ChatMessage> messageCaptor = ArgumentCaptor.forClass(ChatMessage.class);
        verify(chatMessageRepository, times(1)).save(messageCaptor.capture());

        ChatMessage savedMessage = messageCaptor.getValue();
        assertThat(savedMessage.getTripId()).isEqualTo("100");
        assertThat(savedMessage.getSenderId()).isEqualTo("1");
        assertThat(savedMessage.getRecipientId()).isEqualTo("2");
        assertThat(savedMessage.getContent()).isEqualTo("Hello, are you on your way?");
    }

    @Test
    @DisplayName("Should broadcast message to recipient via WebSocket")
    void testProcessMessage_BroadcastToRecipient() {
        // Arrange
        stubRideLookup();
        stubUserLookup();
        when(chatMessageRepository.save(any(ChatMessage.class)))
                .thenReturn(chatMessageEntity);

        // Act
        chatService.processMessage(chatMessageDto);

        // Assert
        // Verify message was sent to recipient
        verify(messagingTemplate, times(1))
                .convertAndSendToUser(
                        eq("passenger@test.com"),
                        eq("/queue/messages"),
                        any(ChatMessage.class));
    }

    @Test
    @DisplayName("Should broadcast confirmation to sender via WebSocket")
    void testProcessMessage_BroadcastToSender() {
        // Arrange
        stubRideLookup();
        stubUserLookup();
        when(chatMessageRepository.save(any(ChatMessage.class)))
                .thenReturn(chatMessageEntity);

        // Act
        chatService.processMessage(chatMessageDto);

        // Assert
        // Verify confirmation was sent back to sender
        verify(messagingTemplate, times(1))
                .convertAndSendToUser(
                        eq("driver@test.com"),
                        eq("/queue/messages"),
                        any(ChatMessage.class));
    }

    @Test
    @DisplayName("Should include timestamp in broadcasted message")
    void testProcessMessage_IncludeTimestamp() {
        // Arrange
        stubRideLookup();
        stubUserLookup();
        when(chatMessageRepository.save(any(ChatMessage.class)))
                .thenReturn(chatMessageEntity);

        // Act
        chatService.processMessage(chatMessageDto);

        // Assert
        ArgumentCaptor<ChatMessage> messageCaptor = ArgumentCaptor.forClass(ChatMessage.class);
        verify(messagingTemplate, times(2))
                .convertAndSendToUser(anyString(), anyString(), messageCaptor.capture());

        List<ChatMessage> broadcastedMessages = messageCaptor.getAllValues();
        assertThat(broadcastedMessages).allMatch(msg -> msg.getTimestamp() != null);
        assertThat(broadcastedMessages).allMatch(msg -> msg.getId() != null);
    }

    @Test
    @DisplayName("Should handle database save failure gracefully")
    void testProcessMessage_DatabaseFailure() {
        // Arrange
        stubRideLookup();
        when(chatMessageRepository.save(any(ChatMessage.class)))
                .thenThrow(new RuntimeException("Database connection failed"));

        // Act & Assert
        assertThatThrownBy(() -> chatService.processMessage(chatMessageDto))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Database connection failed");

        // Verify no messages were broadcast if save failed
        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test
    @DisplayName("Should deny sending messages for completed rides")
    void testProcessMessage_CompletedRide() {
        // Arrange
        stubRideLookup();
        ride.setStatus("COMPLETED");

        // Act & Assert
        assertThatThrownBy(() -> chatService.processMessage(chatMessageDto))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Chat is closed for completed rides.");

        verify(chatMessageRepository, never()).save(any(ChatMessage.class));
        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
    }

    @Test
    @DisplayName("Should deny sending messages for cancelled rides")
    void testProcessMessage_CancelledRide() {
        // Arrange
        stubRideLookup();
        ride.setStatus("CANCELLED_BY_DRIVER");

        // Act & Assert
        assertThatThrownBy(() -> chatService.processMessage(chatMessageDto))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Chat is closed for cancelled rides.");

        verify(chatMessageRepository, never()).save(any(ChatMessage.class));
        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
    }

    // ==================== GET CHAT HISTORY TESTS ====================

    @Test
    @DisplayName("Should retrieve chat history for driver successfully")
    void testGetChatHistory_AsDriver_Success() {
        // Arrange
        String tripId = "100";
        Long driverId = 1L;

        List<ChatMessage> messages = Arrays.asList(
                createChatMessageEntity(1L, "100", "1", "2", "Message 1"),
                createChatMessageEntity(2L, "100", "2", "1", "Message 2"),
                createChatMessageEntity(3L, "100", "1", "2", "Message 3"));

        when(rideRepository.findById(100L)).thenReturn(Optional.of(ride));
        when(chatMessageRepository.findByTripIdOrderByTimestampAsc(tripId)).thenReturn(messages);

        // Act
        List<ChatMessage> result = chatService.getChatHistory(tripId, driverId);

        // Assert
        assertThat(result).hasSize(3);
        assertThat(result).extracting(ChatMessage::getContent)
                .containsExactly("Message 1", "Message 2", "Message 3");
        verify(rideRepository, times(1)).findById(100L);
        verify(chatMessageRepository, times(1)).findByTripIdOrderByTimestampAsc(tripId);
    }

    @Test
    @DisplayName("Should retrieve chat history for passenger successfully")
    void testGetChatHistory_AsPassenger_Success() {
        // Arrange
        String tripId = "100";
        Long passengerId = 2L;

        List<ChatMessage> messages = Arrays.asList(
                createChatMessageEntity(1L, "100", "1", "2", "Hello"),
                createChatMessageEntity(2L, "100", "2", "1", "Hi there"));

        when(rideRepository.findById(100L)).thenReturn(Optional.of(ride));
        when(bookingRepository.findAll()).thenReturn(Collections.singletonList(booking));
        when(chatMessageRepository.findByTripIdOrderByTimestampAsc(tripId)).thenReturn(messages);

        // Act
        List<ChatMessage> result = chatService.getChatHistory(tripId, passengerId);

        // Assert
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getContent()).isEqualTo("Hello");
        assertThat(result.get(1).getContent()).isEqualTo("Hi there");
    }

    @Test
    @DisplayName("Should throw exception when ride not found")
    void testGetChatHistory_RideNotFound() {
        // Arrange
        String tripId = "999";
        Long userId = 1L;

        when(rideRepository.findById(999L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> chatService.getChatHistory(tripId, userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Ride not found");

        verify(chatMessageRepository, never()).findByTripIdOrderByTimestampAsc(anyString());
    }

    @Test
    @DisplayName("Should deny access to unauthorized user")
    void testGetChatHistory_UnauthorizedUser() {
        // Arrange
        String tripId = "100";
        Long unauthorizedUserId = 999L; // Not driver or passenger

        when(rideRepository.findById(100L)).thenReturn(Optional.of(ride));
        when(bookingRepository.findAll()).thenReturn(Collections.singletonList(booking));

        // Act & Assert
        assertThatThrownBy(() -> chatService.getChatHistory(tripId, unauthorizedUserId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("You are not authorized to view this chat");

        verify(chatMessageRepository, never()).findByTripIdOrderByTimestampAsc(anyString());
    }

    @Test
    @DisplayName("Should deny access to passenger with cancelled booking")
    void testGetChatHistory_CancelledBooking() {
        // Arrange
        String tripId = "100";
        Long passengerId = 2L;
        booking.setStatus("CANCELLED");

        when(rideRepository.findById(100L)).thenReturn(Optional.of(ride));
        when(bookingRepository.findAll()).thenReturn(Collections.singletonList(booking));

        // Act & Assert
        assertThatThrownBy(() -> chatService.getChatHistory(tripId, passengerId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("You are not authorized to view this chat");
    }

    @Test
    @DisplayName("Should return empty list when no messages exist for ride")
    void testGetChatHistory_NoMessages() {
        // Arrange
        String tripId = "100";
        Long driverId = 1L;

        when(rideRepository.findById(100L)).thenReturn(Optional.of(ride));
        when(chatMessageRepository.findByTripIdOrderByTimestampAsc(tripId))
                .thenReturn(Collections.emptyList());

        // Act
        List<ChatMessage> result = chatService.getChatHistory(tripId, driverId);

        // Assert
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Should return messages in chronological order")
    void testGetChatHistory_ChronologicalOrder() {
        // Arrange
        String tripId = "100";
        Long driverId = 1L;

        LocalDateTime time1 = LocalDateTime.now().minusHours(2);
        LocalDateTime time2 = LocalDateTime.now().minusHours(1);
        LocalDateTime time3 = LocalDateTime.now();

        List<ChatMessage> messages = Arrays.asList(
                createChatMessageEntityWithTime(1L, "100", "1", "2", "First", time1),
                createChatMessageEntityWithTime(2L, "100", "2", "1", "Second", time2),
                createChatMessageEntityWithTime(3L, "100", "1", "2", "Third", time3));

        when(rideRepository.findById(100L)).thenReturn(Optional.of(ride));
        when(chatMessageRepository.findByTripIdOrderByTimestampAsc(tripId)).thenReturn(messages);

        // Act
        List<ChatMessage> result = chatService.getChatHistory(tripId, driverId);

        // Assert
        assertThat(result).hasSize(3);
        assertThat(result.get(0).getTimestamp()).isEqualTo(time1);
        assertThat(result.get(1).getTimestamp()).isEqualTo(time2);
        assertThat(result.get(2).getTimestamp()).isEqualTo(time3);
    }

    @Test
    @DisplayName("Should handle invalid tripId format")
    void testGetChatHistory_InvalidTripIdFormat() {
        // Arrange
        String invalidTripId = "invalid";
        Long userId = 1L;

        // Act & Assert
        assertThatThrownBy(() -> chatService.getChatHistory(invalidTripId, userId))
                .isInstanceOf(NumberFormatException.class);
    }

    @Test
    @DisplayName("Should allow passenger with multiple bookings to access chat")
    void testGetChatHistory_PassengerWithMultipleBookings() {
        // Arrange
        String tripId = "100";
        Long passengerId = 2L;

        Booking anotherBooking = Booking.builder()
                .id(2L)
                .ride(ride)
                .passenger(passenger)
                .seatsBooked(2)
                .status("CONFIRMED")
                .build();

        List<Booking> bookings = Arrays.asList(booking, anotherBooking);
        List<ChatMessage> messages = Arrays.asList(
                createChatMessageEntity(1L, "100", "1", "2", "Test message"));

        when(rideRepository.findById(100L)).thenReturn(Optional.of(ride));
        when(bookingRepository.findAll()).thenReturn(bookings);
        when(chatMessageRepository.findByTripIdOrderByTimestampAsc(tripId)).thenReturn(messages);

        // Act
        List<ChatMessage> result = chatService.getChatHistory(tripId, passengerId);

        // Assert
        assertThat(result).hasSize(1);
    }

    // ==================== HELPER METHODS ====================

    private ChatMessage createChatMessageEntity(
            Long id, String tripId, String senderId, String recipientId, String content) {
        return ChatMessage.builder()
                .id(id)
                .tripId(tripId)
                .senderId(senderId)
                .recipientId(recipientId)
                .content(content)
                .timestamp(LocalDateTime.now())
                .build();
    }

    private ChatMessage createChatMessageEntityWithTime(
            Long id, String tripId, String senderId, String recipientId,
            String content, LocalDateTime timestamp) {
        return ChatMessage.builder()
                .id(id)
                .tripId(tripId)
                .senderId(senderId)
                .recipientId(recipientId)
                .content(content)
                .timestamp(timestamp)
                .build();
    }

    private void stubRideLookup() {
        when(rideRepository.findById(100L)).thenReturn(Optional.of(ride));
    }

    private void stubUserLookup() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(driver));
        when(userRepository.findById(2L)).thenReturn(Optional.of(passenger));
    }
}
