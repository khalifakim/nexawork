package com.nexawork.ged.repositories;

import com.nexawork.ged.entities.GedFileVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GedFileVersionRepository extends JpaRepository<GedFileVersion, UUID> {

    List<GedFileVersion> findByGedFileIdOrderByVersionNumberDesc(UUID gedFileId);

    Optional<GedFileVersion> findTopByGedFileIdOrderByVersionNumberDesc(UUID gedFileId);
}
