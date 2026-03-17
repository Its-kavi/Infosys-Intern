package com.rideconnect.backend.service;

import com.rideconnect.backend.dto.NotificationDto;
import com.rideconnect.backend.model.Notification;
import com.rideconnect.backend.model.User;
import com.rideconnect.backend.repository.jpa.NotificationRepository;
import com.rideconnect.backend.repository.jpa.UserRepository;
import com.rideconnect.backend.service.event.NotificationEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Service
public class NotificationService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RedisTemplate<String, Long> counterTemplate;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Value("${notifications.unread.prefix}")
    private String unreadCountKeyPrefix;

    @Value("${notifications.time-format}")
    private String notificationsTimeFormat;

    @Value("${notifications.title.ride-update}")
    private String rideUpdateTitle;

    @Value("${notifications.title.booking-update}")
    private String bookingUpdateTitle;

    @Value("${ws.chat.topic-user-prefix}")
    private String topicUserPrefix;

    // Send a notification to a specific user (identified by email)
    public void notifyUser(String email, String title, String message, String type) {
        if (email == null || email.isEmpty()) return;
        eventPublisher.publishEvent(new NotificationEvent(email, title, message, type));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onNotificationEvent(NotificationEvent event) {
        String email = event.getEmail();
        if (email == null || email.isEmpty()) return;

        // 1. Save to Database
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            Notification notificationEntity = Notification.builder()
                    .user(userOpt.get())
                    .title(event.getTitle())
                    .message(event.getMessage())
                    .type(event.getType())
                    .createdAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(notificationEntity);
            
            // Increment unread count in Redis
            counterTemplate.opsForValue().increment(unreadCountKeyPrefix + email);
        }

        // 2. Send via WebSocket
        Long currentCount = counterTemplate.opsForValue().get(unreadCountKeyPrefix + email);
        int unreadCount = currentCount != null ? currentCount.intValue() : 0;

        NotificationDto notification = NotificationDto.builder()
                .title(event.getTitle())
                .message(event.getMessage())
                .type(event.getType())
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ofPattern(notificationsTimeFormat)))
                .unreadCount(unreadCount)
                .build();

        // Push to: /topic/user/{email}
        // Frontend will subscribe to this specific channel
        messagingTemplate.convertAndSend(topicUserPrefix + email, notification);

        System.out.println("ðŸ”” Notification sent to " + email + ": " + event.getMessage());
    }

    public void notifyDriver(String email, String message) {
        notifyUser(email, rideUpdateTitle, message, "INFO");
    }

    public void notifyPassenger(String email, String message) {
        notifyUser(email, bookingUpdateTitle, message, "INFO");
    }
}
