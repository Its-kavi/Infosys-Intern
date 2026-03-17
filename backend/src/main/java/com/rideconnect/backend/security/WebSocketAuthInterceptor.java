package com.rideconnect.backend.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    @Autowired
    private JwtUtil jwtUtil; // Your existing JWT helper class

    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        // Check if this is a connection attempt
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {

            // 1. Extract the token from the "Authorization" header
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);

                // 2. Extract username/email from token
                String username = jwtUtil.extractUsername(token);

                if (username != null) {
                    // 3. Load user details
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    // 4. Validate token
                    if (jwtUtil.validateToken(token, userDetails)) {

                        // 5. Create Authentication object
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities());

                        // 6. Set the user for this websocket session
                        // This allows you to use Principal in the Controller later
                        accessor.setUser(authToken);
                    }
                }
            }
        }
        return message;
    }
}
