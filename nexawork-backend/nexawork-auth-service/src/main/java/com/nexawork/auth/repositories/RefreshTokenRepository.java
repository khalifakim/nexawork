package com.nexawork.auth.repositories;

import com.nexawork.auth.entities.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByToken(String token);

    List<RefreshToken> findAllByUserIdAndRevokedFalse(UUID userId);

    /**
     * R20 — révocation ciblée des sessions dont le workspace actif est celui quitté.
     */
    @Modifying
    @Query("update RefreshToken rt set rt.revoked = true where rt.user.id = :userId and rt.activeOrganisationId = :organisationId and rt.revoked = false")
    int revokeAllByUserIdAndActiveOrganisationId(@Param("userId") UUID userId, @Param("organisationId") UUID organisationId);

    /**
     * REF H — la suppression du workspace propage la déconnexion à tous les membres.
     */
    @Modifying
    @Query("update RefreshToken rt set rt.revoked = true where rt.activeOrganisationId = :organisationId and rt.revoked = false")
    int revokeAllByActiveOrganisationId(@Param("organisationId") UUID organisationId);

    @Modifying
    @Query("update RefreshToken rt set rt.revoked = true where rt.user.id = :userId and rt.revoked = false")
    int revokeAllByUserId(@Param("userId") UUID userId);
}
