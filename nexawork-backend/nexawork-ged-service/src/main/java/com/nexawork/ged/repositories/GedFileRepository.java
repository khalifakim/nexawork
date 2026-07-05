package com.nexawork.ged.repositories;

import com.nexawork.ged.entities.GedFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GedFileRepository extends JpaRepository<GedFile, UUID> {

    List<GedFile> findByFolderIdAndIsDeletedFalse(UUID folderId);

    long countByFolderIdAndIsDeletedFalse(UUID folderId);

    List<GedFile> findByAddedByUserIdAndIsDeletedFalse(UUID userId);

    List<GedFile> findByAddedByUserIdAndIsDeletedTrue(UUID userId);
}
