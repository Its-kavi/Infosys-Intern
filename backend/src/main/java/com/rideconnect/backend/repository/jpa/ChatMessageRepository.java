package com.rideconnect.backend.repository.jpa;

import com.rideconnect.backend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // Efficiently fetch chat history for a specific ride, ordered by time
    List<ChatMessage> findByTripIdOrderByTimestampAsc(String tripId);
}
