package com.nexawork.project.services;

import com.nexawork.project.dtos.requests.AddProjectMemberRequest;
import com.nexawork.project.dtos.requests.UpdateProjectMemberRequest;
import com.nexawork.project.dtos.responses.ProjectMemberResponse;

import java.util.List;
import java.util.UUID;

/**
 * Membres d'un projet (§13.2). Gestion réservée ADMIN+OWNER+chef de projet
 * (R9-R21) ; mutations refusées si le projet est archivé (REF E).
 */
public interface ProjectMemberService {

    List<ProjectMemberResponse> listMembers(UUID projectId);

    ProjectMemberResponse addMember(UUID projectId, AddProjectMemberRequest request);

    ProjectMemberResponse updateMember(UUID projectId, UUID userId, UpdateProjectMemberRequest request);

    void removeMember(UUID projectId, UUID userId);
}
