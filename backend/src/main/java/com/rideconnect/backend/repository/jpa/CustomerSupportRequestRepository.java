package com.rideconnect.backend.repository.jpa;

import com.rideconnect.backend.model.CustomerSupportRequest;
import com.rideconnect.backend.model.SupportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerSupportRequestRepository extends JpaRepository<CustomerSupportRequest, Long> {
    Page<CustomerSupportRequest> findByStatus(SupportStatus status, Pageable pageable);
    List<CustomerSupportRequest> findByPassenger_Id(Long passengerId);
}
