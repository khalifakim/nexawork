package com.nexawork.ged.repositories;

import com.nexawork.ged.entities.GedFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GedFileRepository extends JpaRepository<GedFile, Long> {
    List<GedFile> findByFolderIdAndIsDeletedFalse(Long folderId);
    List<GedFile> findByProjectIdAndIsDeletedFalse(Long projectId);
    List<GedFile> findByTaskIdAndIsDeletedFalse(Long taskId);
    default List<GedFile> findByFolderId(Long folderId) { return findByFolderIdAndIsDeletedFalse(folderId); }
    default List<GedFile> findByProjectId(Long projectId) { return findByProjectIdAndIsDeletedFalse(projectId); }
    default List<GedFile> findByTaskId(Long taskId) { return findByTaskIdAndIsDeletedFalse(taskId); }
}
