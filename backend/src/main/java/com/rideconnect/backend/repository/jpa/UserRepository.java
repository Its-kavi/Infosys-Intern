package com.rideconnect.backend.repository.jpa;

import com.rideconnect.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // This effectively writes: "SELECT * FROM users WHERE email = ?"
    Optional<User> findByEmail(String email);

    // Good to have: check if email exists before registering
    boolean existsByEmail(String email);

    Optional<User> findByEmailVerificationToken(String token);

    Optional<User> findByPasswordResetToken(String token);
}
