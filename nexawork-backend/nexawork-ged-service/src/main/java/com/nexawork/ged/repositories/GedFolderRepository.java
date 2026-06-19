package com.nexawork.ged.repositories;

import com.nexawork.ged.entities.GedFolder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GedFolderRepository extends JpaRepository<GedFolder, Long> {
    List<GedFolder> findByOrganisationIdAndParentIdIsNullAndIsDeletedFalse(Long organisationId);
    List<GedFolder> findByProjectIdAndIsDeletedFalse(Long projectId);
    List<GedFolder> findByParentIdAndIsDeletedFalse(Long parentId);
    // aliases maintenus pour compatibilité interne
    default List<GedFolder> findByOrganisationIdAndParentIdIsNull(Long orgId) {
        return findByOrganisationIdAndParentIdIsNullAndIsDeletedFalse(orgId);
    }
    default List<GedFolder> findByProjectId(Long projectId) {
        return findByProjectIdAndIsDeletedFalse(projectId);
    }
    default List<GedFolder> findByParentId(Long parentId) {
        return findByParentIdAndIsDeletedFalse(parentId);
    }
}
