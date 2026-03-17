package com.rideconnect.backend.controller;

import com.rideconnect.backend.model.Notification;
import com.rideconnect.backend.repository.jpa.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private RedisTemplate<String, Long> counterTemplate;

    @Value("${notifications.unread.prefix}")
    private String unreadCountKeyPrefix;

    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotifications(@AuthenticationPrincipal UserDetails userDetails) {
        List<Notification> notifications = notificationRepository.findByUserEmailOrderByCreatedAtDesc(userDetails.getUsername());
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(@AuthenticationPrincipal UserDetails userDetails) {
        Long count = counterTemplate.opsForValue().get(unreadCountKeyPrefix + userDetails.getUsername());
        return ResponseEntity.ok(Map.of("unreadCount", count != null ? count : 0));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        return notificationRepository.findById(id)
                .map(notification -> {
                    if (!notification.getUser().getEmail().equals(userDetails.getUsername())) {
                        return ResponseEntity.status(403).body(Map.of("message", "Not authorized"));
                    }
                    if (!notification.isRead()) {
                        notification.setRead(true);
                        notificationRepository.save(notification);
                        // Decrement unread count
                        counterTemplate.opsForValue().decrement(unreadCountKeyPrefix + userDetails.getUsername());
                    }
                    return ResponseEntity.ok(Map.of("message", "Marked as read"));
                }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(@AuthenticationPrincipal UserDetails userDetails) {
        List<Notification> notifications = notificationRepository.findByUserEmailOrderByCreatedAtDesc(userDetails.getUsername());
        notifications.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(notifications);
        // Reset unread count
        counterTemplate.delete(unreadCountKeyPrefix + userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "All marked as read"));
    }
}

