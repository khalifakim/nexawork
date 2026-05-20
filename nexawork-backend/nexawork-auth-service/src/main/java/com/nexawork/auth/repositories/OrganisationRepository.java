package com.nexawork.auth.repositories;

import com.nexawork.auth.entities.Organisation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrganisationRepository extends JpaRepository<Organisation, Long> {
    boolean existsBySlug(String slug);
    Optional<Organisation> findBySlug(String slug);
}
