package com.nexawork.file.repositories;

import com.nexawork.file.entities.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StoredFileRepository extends JpaRepository<StoredFile, Long> {
    List<StoredFile> findByProjectId(Long projectId);
    List<StoredFile> findByTaskId(Long taskId);
}
