package com.rideconnect.backend.service;

public interface SmsService {
    void sendSms(String phoneNumber, String message);
}
