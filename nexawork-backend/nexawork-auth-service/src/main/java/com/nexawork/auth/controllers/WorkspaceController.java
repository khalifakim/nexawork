package com.nexawork.auth.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.auth.dtos.requests.CreateInvitationsRequest;
import com.nexawork.auth.dtos.requests.CreateWorkspaceRequest;
import com.nexawork.auth.dtos.requests.UpdateWorkspaceRequest;
import com.nexawork.auth.dtos.responses.InvitationResponse;
import com.nexawork.auth.dtos.responses.MemberResponse;
import com.nexawork.auth.dtos.responses.WorkspaceResponse;
import com.nexawork.auth.services.InvitationService;
import com.nexawork.auth.services.WorkspaceMemberService;
import com.nexawork.auth.services.WorkspaceService;
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
 * Workspaces + sous-ressources membres/invitations (§13.1).
 */
@RestController
@RequestMapping("/api/v1/workspaces")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WorkspaceController {

    WorkspaceService workspaceService;
    WorkspaceMemberService workspaceMemberService;
    InvitationService invitationService;

    @GetMapping
    public Response<List<WorkspaceResponse>> listMine() {
        return Response.<List<WorkspaceResponse>>ok().setPayload(workspaceService.listMine());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<WorkspaceResponse> create(@Valid @RequestBody CreateWorkspaceRequest request) {
        // REF I — le workspace actif de l'appelant n'est pas modifié
        return Response.<WorkspaceResponse>created().setPayload(workspaceService.create(request));
    }

    @GetMapping("/{id}")
    public Response<WorkspaceResponse> get(@PathVariable UUID id) {
        return Response.<WorkspaceResponse>ok().setPayload(workspaceService.get(id));
    }

    @PatchMapping("/{id}")
    public Response<WorkspaceResponse> update(@PathVariable UUID id,
                                              @Valid @RequestBody UpdateWorkspaceRequest request) {
        return Response.<WorkspaceResponse>ok().setPayload(workspaceService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public Response<Void> delete(@PathVariable UUID id) {
        // REF H — OWNER uniquement, propage la déconnexion aux membres
        workspaceService.delete(id);
        return Response.deleted();
    }

    @GetMapping("/{id}/members")
    public Response<List<MemberResponse>> listMembers(@PathVariable UUID id) {
        return Response.<List<MemberResponse>>ok().setPayload(workspaceMemberService.listMembers(id));
    }

    @GetMapping("/{id}/invitations")
    public Response<List<InvitationResponse>> listInvitations(@PathVariable UUID id) {
        return Response.<List<InvitationResponse>>ok().setPayload(invitationService.list(id));
    }

    @PostMapping("/{id}/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    public Response<List<InvitationResponse>> sendInvitations(@PathVariable UUID id,
                                                              @Valid @RequestBody CreateInvitationsRequest request) {
        return Response.<List<InvitationResponse>>created().setPayload(invitationService.send(id, request));
    }
}
