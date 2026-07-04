package com.nexawork.project.repositories;

import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.enums.ProjectStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

    List<Project> findByOrganisationId(UUID organisationId);

    List<Project> findByOrganisationIdAndStatus(UUID organisationId, ProjectStatus status);
}
