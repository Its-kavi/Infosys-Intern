package com.rideconnect.backend.controller;

import com.rideconnect.backend.model.ChatMessage;
import com.rideconnect.backend.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Controller;
import java.security.Principal;

@Controller
public class ChatController {

    @Autowired
    private ChatService chatService;

    @MessageMapping("${ws.chat.mapping}")
    public void sendPrivateMessage(@Payload ChatMessage chatMessage, Principal principal) {
        // Validation: Ensure the sender (principal.getName()) matches
        // chatMessage.getSenderId()
        // You can add validation here if needed

        // Delegate to service for persistence and broadcasting
        chatService.processMessage(chatMessage);
    }

    @MessageExceptionHandler(AccessDeniedException.class)
    @SendToUser("${ws.chat.error-queue}")
    public String handleAccessDenied(AccessDeniedException ex) {
        return ex.getMessage();
    }
}
