package com.nexawork.ged.repositories;

import com.nexawork.ged.entities.GedFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GedFileRepository extends JpaRepository<GedFile, Long> {
    List<GedFile> findByFolderId(Long folderId);
    List<GedFile> findByProjectId(Long projectId);
    List<GedFile> findByTaskId(Long taskId);
}
