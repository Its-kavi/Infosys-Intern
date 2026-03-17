package com.rideconnect.backend.controller;

import com.rideconnect.backend.model.ChatMessage;
import com.rideconnect.backend.model.User;
import com.rideconnect.backend.repository.jpa.UserRepository;
import com.rideconnect.backend.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "${ws.allowed-origins}")
public class ChatHistoryController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/history/{tripId}")
    public ResponseEntity<List<ChatMessage>> getChatHistory(@PathVariable String tripId) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUserEmail = authentication.getName();

        // Fetch user from database to get the actual user ID
        User currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<ChatMessage> history = chatService.getChatHistory(tripId, currentUser.getId());
        return ResponseEntity.ok(history);
    }
}
