package com.rideconnect.backend.service.event;

public class NotificationEvent {
    private final String email;
    private final String title;
    private final String message;
    private final String type;

    public NotificationEvent(String email, String title, String message, String type) {
        this.email = email;
        this.title = title;
        this.message = message;
        this.type = type;
    }

    public String getEmail() {
        return email;
    }

    public String getTitle() {
        return title;
    }

    public String getMessage() {
        return message;
    }

    public String getType() {
        return type;
    }
}
