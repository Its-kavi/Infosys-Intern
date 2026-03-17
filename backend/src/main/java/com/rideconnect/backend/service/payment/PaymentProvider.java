package com.rideconnect.backend.service.payment;

import java.util.Map;

public interface PaymentProvider {

    // Returns a Map with "orderId", "amount", and "providerType"
    Map<String, Object> createOrder(Double amount, Long bookingId) throws Exception;

    // Verifies the signature
    boolean verifyPayment(String orderId, String paymentId, String signature) throws Exception;
}
