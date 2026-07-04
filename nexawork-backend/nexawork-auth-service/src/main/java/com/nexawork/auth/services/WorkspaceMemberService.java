package com.nexawork.auth.services;

import com.nexawork.auth.dtos.requests.LeaveWorkspaceRequest;
import com.nexawork.auth.dtos.requests.ToggleMemberActiveRequest;
import com.nexawork.auth.dtos.requests.UpdateMemberRoleRequest;
import com.nexawork.auth.dtos.responses.LeaveWorkspaceResponse;
import com.nexawork.auth.dtos.responses.MemberResponse;

import java.util.List;
import java.util.UUID;

/**
 * Membres du workspace (§13.1) : REF C (OWNER intangible), R18 (self et OWNER
 * non modifiables), R20 (self-leave avec révocation de session si actif).
 */
public interface WorkspaceMemberService {

    List<MemberResponse> listMembers(UUID workspaceId);

    MemberResponse changeRole(UUID memberId, UpdateMemberRoleRequest request);

    MemberResponse toggleActive(UUID memberId, ToggleMemberActiveRequest request);

    void remove(UUID memberId);

    LeaveWorkspaceResponse leave(LeaveWorkspaceRequest request);
}
