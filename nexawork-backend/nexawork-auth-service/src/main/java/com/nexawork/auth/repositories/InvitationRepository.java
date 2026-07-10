package com.nexawork.auth.repositories;

import com.nexawork.auth.entities.Invitation;
import com.nexawork.auth.entities.enums.InvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, UUID> {

    List<Invitation> findAllByOrganisationId(UUID organisationId);

    /**
     * Invitations encore actionnables d'un workspace (Paramètres ▸ Invitations) :
     * les invitations ACCEPTED sont exclues — la personne est devenue membre et
     * l'invitation n'est plus « en attente ».
     */
    List<Invitation> findAllByOrganisationIdAndStatusNot(UUID organisationId, InvitationStatus status);

    Optional<Invitation> findByToken(String token);

    boolean existsByOrganisationIdAndEmailIgnoreCaseAndStatus(UUID organisationId, String email, InvitationStatus status);
}
