package com.rideconnect.backend.service;

import com.rideconnect.backend.dto.LoginRequest;
import com.rideconnect.backend.dto.UpdateProfileRequest;
import com.rideconnect.backend.model.Role;
import com.rideconnect.backend.model.User;
import com.rideconnect.backend.repository.jpa.UserRepository;
import com.rideconnect.backend.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${user.member-since.format}")
    private String memberSinceFormat;

    @Value("${user.reset-token.expiry-hours}")
    private long resetTokenExpiryHours;

    @Autowired
    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       @Lazy AuthenticationManager authenticationManager,
                       JwtUtil jwtUtil,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
    }

    @Transactional
    public User registerUser(User user) {
        // 1. Check if email exists
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email already in use: " + user.getEmail());
        }

        // 2. SECURITY CHECK: Prevent public Admin registration
        if (user.getRole() == Role.ADMIN) {
            throw new RuntimeException("Cannot register as Admin publicly!");
        }

        // 3. Encrypt password
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        // 4. Set default verification status
        if (user.getRole() == Role.DRIVER) {
            user.setVerified(false);
        } else {
            user.setVerified(true);
        }

        // 5. Generate Email Verification Token
        user.setEmailVerificationToken(UUID.randomUUID().toString());
        user.setEmailVerified(false);

        // 6. Capture Registration Date (Month Year)
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern(memberSinceFormat, Locale.ENGLISH);
        user.setMemberSince(LocalDate.now().format(formatter));

        User savedUser = userRepository.save(user);

        // 7. Send Welcome Email
        String verificationLink = frontendUrl + "/verify-email?token=" + savedUser.getEmailVerificationToken();
        emailService.sendWelcomeEmail(savedUser.getEmail(), savedUser.getName(), verificationLink);

        return savedUser;
    }

    public Map<String, Object> loginUser(LoginRequest loginRequest) {
        // 1. Attempt Authentication (Checks password)
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getEmail(),
                        loginRequest.getPassword()
                )
        );

        // 2. Fetch the User Entity to get Name and ID
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 3. Check if Email is Verified
        if (!user.isEmailVerified()) {
            throw new RuntimeException("Please verify your email before logging in.");
        }

        // 4. Generate Token WITH Name and ID included
        String token = jwtUtil.generateToken(user.getEmail(), user.getName(), user.getId());

        // 4. Extract Role
        String role = user.getRole().name();

        // 5. Construct Response
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("role", user.getRole().name());
        response.put("name", user.getName());
        response.put("isVerified", user.isVerified());


        return response;
    }

    // Helper method to find a user
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }

    // PROFILE UPDATE ---
    public User updateProfile(String email, UpdateProfileRequest request) {
        User user = findByEmail(email);

        // 1. Basic Details
        if (request.getName() != null && !request.getName().isEmpty()) user.setName(request.getName());
        if (request.getPhone() != null && !request.getPhone().isEmpty()) user.setPhone(request.getPhone());

        // 2. New Profile Fields
        if (request.getProfilePictureUrl() != null) user.setProfilePictureUrl(request.getProfilePictureUrl());
        if (request.getBio() != null) user.setBio(request.getBio());

        // 3. Password
        if (request.getNewPassword() != null && !request.getNewPassword().isEmpty()) {
            if (request.getCurrentPassword() == null || request.getCurrentPassword().isEmpty()) {
                throw new RuntimeException("Current password is required to set a new password.");
            }
            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                throw new RuntimeException("Incorrect current password.");
            }
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            emailService.sendPasswordChangeAlert(user.getEmail(), user.getName());
        }

        // 4. Driver Details
        if (user.getRole() == Role.DRIVER) {
            if (request.getVehicleModel() != null && !request.getVehicleModel().isEmpty())
                user.setVehicleModel(request.getVehicleModel());
            if (request.getLicensePlate() != null && !request.getLicensePlate().isEmpty())
                user.setLicensePlate(request.getLicensePlate());
            if (request.getVehicleCapacity() != null)
                user.setVehicleCapacity(request.getVehicleCapacity());

            // New Driver Fields
            if (request.getCarImageUrl() != null) user.setCarImageUrl(request.getCarImageUrl());
            if (request.getCarFeatures() != null) user.setCarFeatures(request.getCarFeatures());
        }

        return userRepository.save(user);
    }

    @Transactional
    public void verifyEmail(String token) {
        System.out.println("🔍 Attempting to verify email with token: " + token);
        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> {
                    System.err.println("❌ Verification failed: Token not found in database: " + token);
                    return new RuntimeException("Invalid verification token");
                });

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        userRepository.save(user);
        System.out.println("✅ Email verified successfully for: " + user.getEmail());
    }

    @Transactional
    public void processForgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        String token = UUID.randomUUID().toString();
        user.setPasswordResetToken(token);
        user.setPasswordResetTokenExpiry(java.time.LocalDateTime.now().plusHours(resetTokenExpiryHours));
        userRepository.save(user);

        String resetLink = frontendUrl + "/reset-password?token=" + token;
        emailService.sendForgotPasswordEmail(user.getEmail(), user.getName(), resetLink);
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByPasswordResetToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired password reset token"));

        if (user.getPasswordResetTokenExpiry().isBefore(java.time.LocalDateTime.now())) {
            throw new RuntimeException("Password reset token has expired");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        userRepository.save(user);
        
        emailService.sendPasswordChangeAlert(user.getEmail(), user.getName());
    }
}
