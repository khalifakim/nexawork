package com.nexawork.auth.repositories;

import com.nexawork.auth.entities.Invitation;
import com.nexawork.auth.entities.enums.InvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, Long> {
    Optional<Invitation> findByToken(String token);
    boolean existsByOrganisationIdAndEmailAndStatus(Long orgId, String email, InvitationStatus status);
}
