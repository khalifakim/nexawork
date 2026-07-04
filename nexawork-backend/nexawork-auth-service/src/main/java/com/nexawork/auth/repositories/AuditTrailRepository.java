package com.nexawork.auth.repositories;

import com.nexawork.auth.entities.audits.AuditTrailEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AuditTrailRepository extends JpaRepository<AuditTrailEntity, UUID> {
}
