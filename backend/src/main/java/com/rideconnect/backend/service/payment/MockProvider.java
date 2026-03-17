package com.rideconnect.backend.service.payment;

import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component("mockProvider")
public class MockProvider implements PaymentProvider {

    @Value("${mock.order.prefix}")
    private String mockOrderPrefix;

    @Value("${mock.provider}")
    private String mockProviderName;

    @Override
    public Map<String, Object> createOrder(Double amount, Long bookingId) {
        // Simulate an Order ID generation
        String fakeOrderId = mockOrderPrefix + UUID.randomUUID().toString().substring(0, 8);

        Map<String, Object> response = new HashMap<>();
        response.put("orderId", fakeOrderId);
        response.put("amount", amount * 100);
        response.put("provider", mockProviderName); // Tells frontend NOT to open Razorpay popup

        return response;
    }

    @Override
    public boolean verifyPayment(String orderId, String paymentId, String signature) {
        // Always return true for mock payments
        return true;
    }
}
