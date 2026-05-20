package com.nexawork.auth.controllers;

import com.nexawork.auth.dtos.requests.CreateOrganisationRequest;
import com.nexawork.auth.dtos.requests.InviteMemberRequest;
import com.nexawork.auth.dtos.requests.UpdateMemberRoleRequest;
import com.nexawork.auth.dtos.responses.MemberResponse;
import com.nexawork.auth.dtos.responses.OrganisationResponse;
import com.nexawork.auth.security.SecurityUtils;
import com.nexawork.auth.services.OrganisationService;
import com.nexawork.auth.utils.Response;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Organisations")
@RestController
@RequestMapping("/api/v1/organisations")
@RequiredArgsConstructor
public class OrganisationController {

    private final OrganisationService organisationService;

    @Operation(summary = "Créer une organisation")
    @PostMapping
    public ResponseEntity<Response<OrganisationResponse>> create(
            @Valid @RequestBody CreateOrganisationRequest request) {
        OrganisationResponse org = organisationService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Response.created(org, "Organisation créée"));
    }

    @Operation(summary = "Récupérer une organisation par ID")
    @GetMapping("/{id}")
    public ResponseEntity<Response<OrganisationResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(Response.ok(organisationService.findById(id), "Organisation récupérée"));
    }

    @Operation(summary = "Lister les membres")
    @GetMapping("/{orgId}/members")
    public ResponseEntity<Response<List<MemberResponse>>> listMembers(@PathVariable Long orgId) {
        return ResponseEntity.ok(Response.ok(organisationService.listMembers(orgId), "Membres récupérés"));
    }

    @Operation(summary = "Inviter un membre")
    @PostMapping("/{orgId}/invite")
    public ResponseEntity<Response<Void>> inviteMember(
            @PathVariable Long orgId,
            @Valid @RequestBody InviteMemberRequest request) {
        String inviterEmail = SecurityUtils.getCurrentUserLogin()
            .orElseThrow(() -> new RuntimeException("Non authentifié"));
        organisationService.inviteMember(orgId, request, inviterEmail);
        return ResponseEntity.ok(Response.ok(null, "Invitation envoyée"));
    }

    @Operation(summary = "Accepter une invitation")
    @GetMapping("/invitations/accept")
    public ResponseEntity<Response<String>> acceptInvitation(@RequestParam String token) {
        String result = organisationService.acceptInvitation(token);
        return ResponseEntity.ok(Response.ok(result, "Invitation traitée"));
    }

    @Operation(summary = "Modifier le rôle d'un membre")
    @PutMapping("/{orgId}/members/{userId}/role")
    public ResponseEntity<Response<Void>> updateMemberRole(
            @PathVariable Long orgId,
            @PathVariable Long userId,
            @Valid @RequestBody UpdateMemberRoleRequest request) {
        String requesterEmail = SecurityUtils.getCurrentUserLogin()
            .orElseThrow(() -> new RuntimeException("Non authentifié"));
        organisationService.updateMemberRole(orgId, userId, request, requesterEmail);
        return ResponseEntity.ok(Response.ok(null, "Rôle mis à jour"));
    }

    @Operation(summary = "Retirer un membre")
    @DeleteMapping("/{orgId}/members/{userId}")
    public ResponseEntity<Response<Void>> removeMember(
            @PathVariable Long orgId,
            @PathVariable Long userId) {
        String requesterEmail = SecurityUtils.getCurrentUserLogin()
            .orElseThrow(() -> new RuntimeException("Non authentifié"));
        organisationService.removeMember(orgId, userId, requesterEmail);
        return ResponseEntity.ok(Response.ok(null, "Membre retiré"));
    }
}
