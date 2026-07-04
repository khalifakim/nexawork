package com.nexawork.auth.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.auth.dtos.requests.LeaveWorkspaceRequest;
import com.nexawork.auth.dtos.requests.ToggleMemberActiveRequest;
import com.nexawork.auth.dtos.requests.UpdateMemberRoleRequest;
import com.nexawork.auth.dtos.responses.LeaveWorkspaceResponse;
import com.nexawork.auth.dtos.responses.MemberResponse;
import com.nexawork.auth.services.WorkspaceMemberService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Mutations sur les membres d'un workspace (§13.1 /workspace-members/**) —
 * R18, REF C, R20 appliqués en service.
 */
@RestController
@RequestMapping("/api/v1/workspace-members")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WorkspaceMemberController {

    WorkspaceMemberService workspaceMemberService;

    @PatchMapping("/{id}/role")
    public Response<MemberResponse> changeRole(@PathVariable UUID id,
                                               @Valid @RequestBody UpdateMemberRoleRequest request) {
        return Response.<MemberResponse>ok().setPayload(workspaceMemberService.changeRole(id, request));
    }

    @PatchMapping("/{id}/active")
    public Response<MemberResponse> toggleActive(@PathVariable UUID id,
                                                 @Valid @RequestBody ToggleMemberActiveRequest request) {
        return Response.<MemberResponse>ok().setPayload(workspaceMemberService.toggleActive(id, request));
    }

    @DeleteMapping("/{id}")
    public Response<Void> remove(@PathVariable UUID id) {
        workspaceMemberService.remove(id);
        return Response.deleted();
    }

    @PostMapping("/leave")
    public Response<LeaveWorkspaceResponse> leave(@Valid @RequestBody LeaveWorkspaceRequest request) {
        return Response.<LeaveWorkspaceResponse>ok().setPayload(workspaceMemberService.leave(request));
    }
}
