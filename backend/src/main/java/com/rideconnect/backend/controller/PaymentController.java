package com.rideconnect.backend.controller;

import com.rideconnect.backend.model.Payment;
import com.rideconnect.backend.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Long> request) {
        Long bookingId = request.get("bookingId");
        Map<String, Object> orderDetails = paymentService.initiatePayment(bookingId);
        return ResponseEntity.ok(orderDetails);
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody Map<String, Object> data) {
        Long bookingId = Long.valueOf(data.get("bookingId").toString());

        String paymentId = getString(data, "razorpayPaymentId", "paymentId");
        String orderId = getString(data, "razorpayOrderId", "orderId");
        String signature = getString(data, "razorpaySignature", "signature");
        String provider = getString(data, "provider", "provider");

        if (signature == null || signature.equals("null")) {
            throw new RuntimeException("Payment Signature is missing!");
        }

        Payment payment = paymentService.completePayment(bookingId, orderId, paymentId, signature, provider);
        return ResponseEntity.ok(payment);
    }

    @GetMapping("/history")
    public List<Payment> getMyHistory(@AuthenticationPrincipal UserDetails userDetails) {
        return paymentService.getMyPaymentHistory(userDetails.getUsername());
    }

    private String getString(Map<String, Object> data, String key1, String key2) {
        if (data.containsKey(key1) && data.get(key1) != null) return data.get(key1).toString();
        if (data.containsKey(key2) && data.get(key2) != null) return data.get(key2).toString();
        return null;
    }

    @GetMapping("/driver-stats")
    public ResponseEntity<?> getDriverStats(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<Map<String, Object>> stats = paymentService.getDriverWeeklyEarnings(userDetails.getUsername());
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
