package com.rideconnect.backend.config;

import com.rideconnect.backend.security.WebSocketAuthInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Value("${ws.broker.simple-prefixes}")
    private String brokerSimplePrefixes;

    @Value("${ws.app-destination-prefix}")
    private String appDestinationPrefix;

    @Value("${ws.user-destination-prefix}")
    private String userDestinationPrefix;

    @Value("${ws.endpoints}")
    private String wsEndpoints;

    @Value("${ws.allowed-origins}")
    private String wsAllowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {

        // 1. Enable a simple memory-based message broker
        // Frontend subscribes to /topic/user/{email} and /queue for private messages
        config.enableSimpleBroker(splitCsv(brokerSimplePrefixes).toArray(new String[0]));
        // 2. Prefix for messages sent FROM client to server (if needed)
        config.setApplicationDestinationPrefixes(appDestinationPrefix);
        // 3. Prefix for user-specific destinations
        config.setUserDestinationPrefix(userDestinationPrefix);

    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 3. Register the endpoint the client connects to
        // Allowed origins * fixes CORS for sockets
        for (String endpoint : splitCsv(wsEndpoints)) {
            registry.addEndpoint(endpoint)
                    .setAllowedOriginPatterns(splitCsv(wsAllowedOrigins).toArray(new String[0]))
                    .withSockJS();
        }
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Add our interceptor to the channel that receives messages from clients
        registration.interceptors(webSocketAuthInterceptor);
    }

    private java.util.List<String> splitCsv(String value) {
        return java.util.Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(java.util.stream.Collectors.toList());
    }
}
