package com.rideconnect.backend.service.impl;

import com.rideconnect.backend.service.SmsService;
import org.springframework.stereotype.Service;

@Service
public class MockSmsService implements SmsService {
    @Override
    public void sendSms(String phoneNumber, String message) {
        // SIMULATION
        System.out.println("📱 [MOCK SMS] To: " + phoneNumber + " | Message: " + message);
    }
}
