package com.nexawork.ged.repositories;

import com.nexawork.ged.entities.GedFolder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GedFolderRepository extends JpaRepository<GedFolder, Long> {
    List<GedFolder> findByOrganisationIdAndParentIdIsNull(Long organisationId);
    List<GedFolder> findByProjectId(Long projectId);
    List<GedFolder> findByParentId(Long parentId);
}
