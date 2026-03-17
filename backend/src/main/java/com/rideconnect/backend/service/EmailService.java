package com.rideconnect.backend.service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import jakarta.mail.internet.MimeMessage;
import java.util.Map;
import java.util.HashMap;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private TemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String senderEmail;

    @Value("${email.charset}")
    private String emailCharset;

    @Value("${email.subject.welcome}")
    private String subjectWelcome;

    @Value("${email.template.welcome}")
    private String templateWelcome;

    @Value("${email.subject.password-change}")
    private String subjectPasswordChange;

    @Value("${email.template.password-change}")
    private String templatePasswordChange;

    @Value("${email.subject.new-booking-driver}")
    private String subjectNewBookingDriver;

    @Value("${email.template.new-booking-driver}")
    private String templateNewBookingDriver;

    @Value("${email.subject.review-request}")
    private String subjectReviewRequest;

    @Value("${email.template.review-request}")
    private String templateReviewRequest;

    @Value("${email.subject.booking-confirm}")
    private String subjectBookingConfirm;

    @Value("${email.template.booking-confirm}")
    private String templateBookingConfirm;

    @Value("${email.subject.ride-cancel}")
    private String subjectRideCancel;

    @Value("${email.template.ride-cancel}")
    private String templateRideCancel;

    @Value("${email.subject.monthly-summary}")
    private String subjectMonthlySummary;

    @Value("${email.template.monthly-summary}")
    private String templateMonthlySummary;

    @Value("${email.subject.forgot-password}")
    private String subjectForgotPassword;

    @Value("${email.template.forgot-password}")
    private String templateForgotPassword;

    @Value("${email.subject.ride-reminder}")
    private String subjectRideReminder;

    // @Async ensures the API doesn't wait for the email to send (Fire and Forget)
    @Async
    public void sendEmail(String toEmail, String subject, String body) {
        sendHtmlEmail(toEmail, subject, body, null);
    }

    @Async
    public void sendHtmlEmail(String toEmail, String subject, String templateName, Map<String, Object> variables) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, emailCharset);

            helper.setFrom(senderEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);

            String htmlContent;
            if (variables != null) {
                Context context = new Context();
                context.setVariables(variables);
                htmlContent = templateEngine.process(templateName, context);
            } else {
                // Fallback for plain text or direct body
                htmlContent = templateName;
            }

            helper.setText(htmlContent, true);

            mailSender.send(message);
            System.out.println("📧 Email sent successfully to: " + toEmail);
        } catch (Exception e) {
            System.err.println("❌ Failed to send email: " + e.getMessage());
        }
    }

    public void sendWelcomeEmail(String toEmail, String name, String verificationLink) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("name", name);
        variables.put("verificationLink", verificationLink);
        sendHtmlEmail(toEmail, subjectWelcome, templateWelcome, variables);
    }

    public void sendPasswordChangeAlert(String toEmail, String name) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("name", name);
        sendHtmlEmail(toEmail, subjectPasswordChange, templatePasswordChange, variables);
    }

    public void sendNewBookingAlertForDriver(String toEmail, String driverName, String passengerName, String source, String dest) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("driverName", driverName);
        variables.put("passengerName", passengerName);
        variables.put("source", source);
        variables.put("dest", dest);
        sendHtmlEmail(toEmail, subjectNewBookingDriver, templateNewBookingDriver, variables);
    }

    public void sendReviewRequest(String toEmail, String name, String driverName) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("name", name);
        variables.put("driverName", driverName);
        sendHtmlEmail(toEmail, String.format(subjectReviewRequest, driverName), templateReviewRequest, variables);
    }

    public void sendBookingConfirmation(String toEmail, String name, String source, String dest, Double amount, String otp) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("name", name);
        variables.put("source", source);
        variables.put("dest", dest);
        variables.put("amount", amount);
        variables.put("otp", otp);
        sendHtmlEmail(toEmail, String.format(subjectBookingConfirm, source, dest), templateBookingConfirm, variables);
    }

    public void sendRideCancellation(String toEmail, String name, String source, String dest) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("name", name);
        variables.put("source", source);
        variables.put("dest", dest);
        sendHtmlEmail(toEmail, subjectRideCancel, templateRideCancel, variables);
    }

    public void sendMonthlySummary(String toEmail, String name, Double totalSpent, Integer rideCount) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("name", name);
        variables.put("totalSpent", totalSpent);
        variables.put("rideCount", rideCount);
        sendHtmlEmail(toEmail, subjectMonthlySummary, templateMonthlySummary, variables);
    }

    public void sendForgotPasswordEmail(String toEmail, String name, String resetLink) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("name", name);
        variables.put("resetLink", resetLink);
        sendHtmlEmail(toEmail, subjectForgotPassword, templateForgotPassword, variables);
    }
}
