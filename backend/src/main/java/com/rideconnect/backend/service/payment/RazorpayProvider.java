package com.rideconnect.backend.service.payment;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component("razorpayProvider")
public class RazorpayProvider implements PaymentProvider {

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    @Value("${razorpay.currency}")
    private String razorpayCurrency;

    @Value("${razorpay.receipt.prefix}")
    private String razorpayReceiptPrefix;

    @Value("${razorpay.provider}")
    private String razorpayProviderName;

    @Override
    public Map<String, Object> createOrder(Double amount, Long bookingId) throws Exception {
        RazorpayClient client = new RazorpayClient(keyId, keySecret);

        JSONObject options = new JSONObject();
        // Razorpay expects amount in PAISA (multiply by 100)
        options.put("amount", amount * 100);
        options.put("currency", razorpayCurrency);
        options.put("receipt", razorpayReceiptPrefix + bookingId);

        Order order = client.orders.create(options);

        Map<String, Object> response = new HashMap<>();
        response.put("orderId", order.get("id"));
        response.put("amount", order.get("amount"));
        response.put("key", keyId); // Frontend needs this to open the popup
        response.put("provider", razorpayProviderName);

        return response;
    }

    @Override
    public boolean verifyPayment(String orderId, String paymentId, String signature) throws Exception {
        JSONObject options = new JSONObject();
        options.put("razorpay_order_id", orderId);
        options.put("razorpay_payment_id", paymentId);
        options.put("razorpay_signature", signature);

        return Utils.verifyPaymentSignature(options, keySecret);
    }
}
