package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.requests.AddProjectMemberRequest;
import com.nexawork.project.dtos.requests.UpdateProjectMemberRequest;
import com.nexawork.project.dtos.responses.ProjectMemberResponse;
import com.nexawork.project.services.ProjectMemberService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Membres d'un projet (§13.2). Gestion réservée ADMIN+OWNER+chef de projet
 * (R9-R21) ; refus 409 si le projet est archivé (REF E).
 */
@RestController
@RequestMapping("/api/v1/projects/{projectId}/members")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProjectMemberController {

    ProjectMemberService projectMemberService;

    @GetMapping
    public Response<List<ProjectMemberResponse>> list(@PathVariable UUID projectId) {
        return Response.<List<ProjectMemberResponse>>ok().setPayload(projectMemberService.listMembers(projectId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<ProjectMemberResponse> add(@PathVariable UUID projectId,
                                               @Valid @RequestBody AddProjectMemberRequest request) {
        return Response.<ProjectMemberResponse>created().setPayload(projectMemberService.addMember(projectId, request));
    }

    @PatchMapping("/{userId}")
    public Response<ProjectMemberResponse> update(@PathVariable UUID projectId,
                                                  @PathVariable UUID userId,
                                                  @Valid @RequestBody UpdateProjectMemberRequest request) {
        return Response.<ProjectMemberResponse>ok()
                .setPayload(projectMemberService.updateMember(projectId, userId, request));
    }

    @DeleteMapping("/{userId}")
    public Response<Void> remove(@PathVariable UUID projectId, @PathVariable UUID userId) {
        projectMemberService.removeMember(projectId, userId);
        return Response.deleted();
    }
}
