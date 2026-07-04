package com.nexawork.auth.services.impl;

import com.nexawork.commons.exceptions.ForbiddenActionException;
import com.nexawork.commons.exceptions.ResourceAlreadyExistException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.commons.security.SecurityUtils;
import com.nexawork.auth.annotations.Journal;
import com.nexawork.auth.annotations.JournalAttribute;
import com.nexawork.auth.dtos.requests.CreateWorkspaceRequest;
import com.nexawork.auth.dtos.requests.UpdateWorkspaceRequest;
import com.nexawork.auth.dtos.responses.WorkspaceResponse;
import com.nexawork.auth.entities.Organisation;
import com.nexawork.auth.entities.OrganisationMember;
import com.nexawork.auth.entities.User;
import com.nexawork.auth.entities.enums.OrgRole;
import com.nexawork.auth.mappers.OrganisationMapper;
import com.nexawork.auth.repositories.OrganisationMemberRepository;
import com.nexawork.auth.repositories.OrganisationRepository;
import com.nexawork.auth.repositories.RefreshTokenRepository;
import com.nexawork.auth.repositories.UserRepository;
import com.nexawork.auth.services.WorkspaceService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Workspaces (§13.1) — REF I : la création ne bascule jamais le contexte de
 * session ; REF H : suppression OWNER-only, propage la déconnexion à tous les
 * membres (révocation des sessions actives du workspace).
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WorkspaceServiceImpl implements WorkspaceService {

    OrganisationRepository organisationRepository;
    OrganisationMemberRepository organisationMemberRepository;
    RefreshTokenRepository refreshTokenRepository;
    UserRepository userRepository;
    OrganisationMapper organisationMapper;

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceResponse> listMine() {
        User user = currentUser();
        return organisationMemberRepository.findAllByUserId(user.getId()).stream()
                .filter(member -> Boolean.FALSE.equals(member.getIsDeactivated()))
                .map(this::toResponseWithContext)
                .toList();
    }

    @Override
    @Journal(actionType = "WORKSPACE_CREATE", entityName = "Organisation")
    public WorkspaceResponse create(@JournalAttribute("request") CreateWorkspaceRequest request) {
        User user = currentUser();

        String slug = request.getSlug() != null && !request.getSlug().isBlank()
                ? request.getSlug()
                : slugify(request.getName());
        if (organisationRepository.existsBySlug(slug)) {
            throw new ResourceAlreadyExistException("Cet identifiant d'espace est déjà utilisé.");
        }

        Organisation organisation = organisationRepository.save(Organisation.builder()
                .name(request.getName())
                .slug(slug)
                .color(request.getColor())
                .build());

        OrganisationMember founder = organisationMemberRepository.save(OrganisationMember.builder()
                .organisation(organisation)
                .user(user)
                .orgRole(OrgRole.OWNER)
                .isOwner(true)
                .isDeactivated(false)
                .joinedAt(LocalDateTime.now())
                .build());

        log.info("Workspace '{}' créé par {} (REF I : pas de bascule de session)",
                organisation.getName(), user.getEmail());
        return toResponseWithContext(founder);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceResponse get(UUID workspaceId) {
        OrganisationMember membership = requireMembership(workspaceId);
        return toResponseWithContext(membership);
    }

    @Override
    @Journal(actionType = "WORKSPACE_UPDATE", entityName = "Organisation")
    public WorkspaceResponse update(UUID workspaceId, UpdateWorkspaceRequest request) {
        OrganisationMember membership = requireMembership(workspaceId);
        if (membership.getOrgRole() != OrgRole.OWNER && membership.getOrgRole() != OrgRole.ADMIN) {
            throw new ForbiddenActionException("Seuls le propriétaire et les administrateurs peuvent modifier le workspace.");
        }

        Organisation organisation = membership.getOrganisation();
        if (request.getName() != null && !request.getName().isBlank()) {
            organisation.setName(request.getName());
        }
        if (request.getColor() != null) {
            organisation.setColor(request.getColor());
        }
        organisationRepository.save(organisation);
        return toResponseWithContext(membership);
    }

    @Override
    @Journal(actionType = "WORKSPACE_DELETE", entityName = "Organisation")
    public void delete(@JournalAttribute("workspaceId") UUID workspaceId) {
        OrganisationMember membership = requireMembership(workspaceId);

        // REF H — OWNER seul (orgRole=OWNER && isOwner=true), 403 pour ADMIN/MEMBER
        if (membership.getOrgRole() != OrgRole.OWNER || !Boolean.TRUE.equals(membership.getIsOwner())) {
            throw new ForbiddenActionException("Seul le propriétaire peut supprimer le workspace.");
        }

        // REF H — propage la déconnexion : révoque toutes les sessions actives du workspace
        int revoked = refreshTokenRepository.revokeAllByActiveOrganisationId(workspaceId);
        organisationRepository.delete(membership.getOrganisation());
        log.info("Workspace {} supprimé — {} session(s) révoquée(s) (REF H)", workspaceId, revoked);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private WorkspaceResponse toResponseWithContext(OrganisationMember membership) {
        WorkspaceResponse response = organisationMapper.asDto(membership.getOrganisation());
        response.setMyRole(membership.getOrgRole());
        response.setIsOwner(membership.getIsOwner());
        response.setMemberCount(organisationMemberRepository.countByOrganisationId(
                membership.getOrganisation().getId()));
        return response;
    }

    private OrganisationMember requireMembership(UUID workspaceId) {
        User user = currentUser();
        // 404 (et non 403) si non-membre : ne pas révéler l'existence du workspace
        return organisationMemberRepository.findByOrganisationIdAndUserId(workspaceId, user.getId())
                .filter(member -> Boolean.FALSE.equals(member.getIsDeactivated()))
                .orElseThrow(() -> new ResourceNotFoundException("Workspace introuvable."));
    }

    private User currentUser() {
        String email = SecurityUtils.getCurrentUserLogin()
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non authentifié."));
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
    }

    private String slugify(String name) {
        String normalized = Normalizer.normalize(name, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        String candidate = normalized.isBlank() ? "espace" : normalized;
        String slug = candidate;
        int suffix = 2;
        while (organisationRepository.existsBySlug(slug)) {
            slug = candidate + "-" + suffix++;
        }
        return slug;
    }
}
