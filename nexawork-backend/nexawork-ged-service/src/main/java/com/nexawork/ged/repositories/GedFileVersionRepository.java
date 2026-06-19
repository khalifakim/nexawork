package com.nexawork.ged.repositories;

import com.nexawork.ged.entities.GedFileVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GedFileVersionRepository extends JpaRepository<GedFileVersion, Long> {

    List<GedFileVersion> findByGedFileIdOrderByVersionNumberDesc(Long gedFileId);

    int countByGedFileId(Long gedFileId);
}
