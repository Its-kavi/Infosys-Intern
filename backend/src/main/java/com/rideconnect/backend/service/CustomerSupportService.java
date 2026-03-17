package com.rideconnect.backend.service;

import com.rideconnect.backend.model.Booking;
import com.rideconnect.backend.model.CustomerSupportRequest;
import com.rideconnect.backend.model.SupportStatus;
import com.rideconnect.backend.repository.jpa.BookingRepository;
import com.rideconnect.backend.repository.jpa.CustomerSupportRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class CustomerSupportService {

    @Autowired
    private CustomerSupportRequestRepository supportRequestRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Transactional
    public CustomerSupportRequest create(Long bookingId, String passengerEmail, String issueDescription,
                                         Boolean refundRequested, List<String> evidenceUrls) {
        if (issueDescription == null || issueDescription.trim().isEmpty()) {
            throw new RuntimeException("Issue description is required");
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getPassenger().getEmail().equals(passengerEmail)) {
            throw new RuntimeException("Not authorized to create support request for this booking");
        }

        List<String> cleanedEvidence = new ArrayList<>();
        if (evidenceUrls != null) {
            for (String url : evidenceUrls) {
                if (url != null && !url.trim().isEmpty()) {
                    cleanedEvidence.add(url.trim());
                }
            }
        }

        CustomerSupportRequest request = CustomerSupportRequest.builder()
                .booking(booking)
                .ride(booking.getRide())
                .passenger(booking.getPassenger())
                .driver(booking.getRide().getDriver())
                .rideSource(booking.getRide().getSource())
                .rideDestination(booking.getRide().getDestination())
                .rideDate(booking.getRide().getTravelDate())
                .rideTime(booking.getRide().getTravelTime())
                .issueDescription(issueDescription.trim())
                .refundRequested(Boolean.TRUE.equals(refundRequested))
                .evidenceUrls(cleanedEvidence)
                .status(SupportStatus.PENDING)
                .build();

        return supportRequestRepository.save(request);
    }

    public List<CustomerSupportRequest> getMyRequests(Long passengerId) {
        return supportRequestRepository.findByPassenger_Id(passengerId);
    }

    public Page<CustomerSupportRequest> listRequests(SupportStatus status, Pageable pageable) {
        if (status != null) {
            return supportRequestRepository.findByStatus(status, pageable);
        }
        return supportRequestRepository.findAll(pageable);
    }

    @Transactional
    public CustomerSupportRequest updateStatus(Long requestId, SupportStatus status, String adminNotes, Long adminId) {
        CustomerSupportRequest request = supportRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Support request not found"));

        if (status != null) {
            request.setStatus(status);
        }
        if (adminNotes != null) {
            request.setAdminNotes(adminNotes);
        }
        request.setAdminId(adminId);

        return supportRequestRepository.save(request);
    }
}
