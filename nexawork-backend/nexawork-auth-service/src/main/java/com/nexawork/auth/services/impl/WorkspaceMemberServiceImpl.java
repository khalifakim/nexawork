package com.nexawork.auth.services.impl;

import com.nexawork.commons.exceptions.ForbiddenActionException;
import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.commons.security.SecurityUtils;
import com.nexawork.auth.annotations.Journal;
import com.nexawork.auth.annotations.JournalAttribute;
import com.nexawork.auth.dtos.requests.LeaveWorkspaceRequest;
import com.nexawork.auth.dtos.requests.ToggleMemberActiveRequest;
import com.nexawork.auth.dtos.requests.UpdateMemberRoleRequest;
import com.nexawork.auth.dtos.responses.LeaveWorkspaceResponse;
import com.nexawork.auth.dtos.responses.MemberResponse;
import com.nexawork.auth.entities.OrganisationMember;
import com.nexawork.auth.entities.User;
import com.nexawork.auth.entities.enums.OrgRole;
import com.nexawork.auth.mappers.OrganisationMemberMapper;
import com.nexawork.auth.repositories.OrganisationMemberRepository;
import com.nexawork.auth.repositories.RefreshTokenRepository;
import com.nexawork.auth.repositories.UserRepository;
import com.nexawork.auth.services.WorkspaceMemberService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Membres du workspace (§13.1) :
 * <ul>
 *   <li>REF C — OWNER intangible : toute mutation ciblant un OWNER → 400</li>
 *   <li>R18 — self-modification refusée (400), réservé OWNER + ADMIN (403)</li>
 *   <li>R20 — self-leave : révoque la session si le workspace quitté est actif,
 *       retourne wasActive pour déclencher session.logout() côté client</li>
 * </ul>
 * Les erreurs « métier interdit » (self/OWNER) sortent en 400 conformément à
 * §13.1 ; les défauts de rôle sortent en 403.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WorkspaceMemberServiceImpl implements WorkspaceMemberService {

    OrganisationMemberRepository organisationMemberRepository;
    RefreshTokenRepository refreshTokenRepository;
    UserRepository userRepository;
    OrganisationMemberMapper organisationMemberMapper;

    @Override
    @Transactional(readOnly = true)
    public List<MemberResponse> listMembers(UUID workspaceId) {
        requireMembership(workspaceId);
        return organisationMemberMapper.parse(
                organisationMemberRepository.findAllByOrganisationId(workspaceId));
    }

    @Override
    @Journal(actionType = "MEMBER_ROLE_CHANGE", entityName = "OrganisationMember")
    public MemberResponse changeRole(@JournalAttribute("memberId") UUID memberId,
                                     UpdateMemberRoleRequest request) {
        OrganisationMember target = findMember(memberId);
        OrganisationMember caller = requireAdminOfSameWorkspace(target);

        // R18 — interdit sur soi-même
        if (caller.getId().equals(target.getId())) {
            throw new InvalidRequestException("Vous ne pouvez pas modifier votre propre rôle.");
        }
        // REF C / R18 — le rôle OWNER n'est ni retirable ni attribuable
        if (target.getOrgRole() == OrgRole.OWNER || Boolean.TRUE.equals(target.getIsOwner())) {
            throw new InvalidRequestException("Le rôle du propriétaire n'est pas modifiable.");
        }
        if (request.getRole() == OrgRole.OWNER) {
            throw new InvalidRequestException("Le rôle OWNER n'est pas attribuable.");
        }

        target.setOrgRole(request.getRole());
        return organisationMemberMapper.asDto(organisationMemberRepository.save(target));
    }

    @Override
    @Journal(actionType = "MEMBER_ACTIVE_TOGGLE", entityName = "OrganisationMember")
    public MemberResponse toggleActive(@JournalAttribute("memberId") UUID memberId,
                                       ToggleMemberActiveRequest request) {
        OrganisationMember target = findMember(memberId);
        OrganisationMember caller = requireAdminOfSameWorkspace(target);

        if (caller.getId().equals(target.getId())) {
            throw new InvalidRequestException("Vous ne pouvez pas modifier votre propre statut.");
        }
        if (target.getOrgRole() == OrgRole.OWNER || Boolean.TRUE.equals(target.getIsOwner())) {
            throw new InvalidRequestException("Le propriétaire ne peut pas être désactivé.");
        }

        target.setIsDeactivated(!request.getActive());
        OrganisationMember saved = organisationMemberRepository.save(target);

        // Un membre désactivé ne peut plus se connecter à ce workspace :
        // ses sessions actives sur ce workspace sont révoquées
        if (Boolean.TRUE.equals(saved.getIsDeactivated())) {
            refreshTokenRepository.revokeAllByUserIdAndActiveOrganisationId(
                    saved.getUser().getId(), saved.getOrganisation().getId());
        }
        return organisationMemberMapper.asDto(saved);
    }

    @Override
    @Journal(actionType = "MEMBER_REMOVE", entityName = "OrganisationMember")
    public void remove(@JournalAttribute("memberId") UUID memberId) {
        OrganisationMember target = findMember(memberId);
        OrganisationMember caller = requireAdminOfSameWorkspace(target);

        if (caller.getId().equals(target.getId())) {
            throw new InvalidRequestException("Utilisez la fonction « Quitter le workspace » pour vous retirer.");
        }
        if (target.getOrgRole() == OrgRole.OWNER || Boolean.TRUE.equals(target.getIsOwner())) {
            throw new InvalidRequestException("Le propriétaire ne peut pas être retiré du workspace.");
        }

        // Soft leave côté back : l'appartenance est supprimée (l'historique des
        // contenus créés — commentaires, mentions — vit dans les autres services
        // et référence userId, il est donc préservé), l'accès est coupé.
        refreshTokenRepository.revokeAllByUserIdAndActiveOrganisationId(
                target.getUser().getId(), target.getOrganisation().getId());
        organisationMemberRepository.delete(target);
        log.info("Membre {} retiré du workspace {}", target.getUser().getEmail(),
                target.getOrganisation().getId());
    }

    @Override
    @Journal(actionType = "MEMBER_SELF_LEAVE", entityName = "OrganisationMember")
    public LeaveWorkspaceResponse leave(LeaveWorkspaceRequest request) {
        User caller = currentUser();
        OrganisationMember membership = organisationMemberRepository
                .findByOrganisationIdAndUserId(request.getWorkspaceId(), caller.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Vous n'êtes pas membre de ce workspace."));

        // REF C — le OWNER ne peut pas quitter son workspace (400)
        if (membership.getOrgRole() == OrgRole.OWNER || Boolean.TRUE.equals(membership.getIsOwner())) {
            throw new InvalidRequestException("Le propriétaire ne peut pas quitter son workspace.");
        }

        // R20 — le workspace quitté est-il le workspace actif de la session ?
        boolean wasActive = SecurityUtils.getCurrentOrganisationId()
                .map(activeId -> activeId.equals(request.getWorkspaceId()))
                .orElse(false);

        organisationMemberRepository.delete(membership);

        if (wasActive) {
            int revoked = refreshTokenRepository.revokeAllByUserIdAndActiveOrganisationId(
                    caller.getId(), request.getWorkspaceId());
            log.info("Self-leave workspace actif {} par {} — {} session(s) révoquée(s) (R20)",
                    request.getWorkspaceId(), caller.getEmail(), revoked);
        }

        return LeaveWorkspaceResponse.builder().wasActive(wasActive).build();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private OrganisationMember findMember(UUID memberId) {
        return organisationMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Membre introuvable."));
    }

    /**
     * L'appelant doit être membre actif OWNER/ADMIN du même workspace que la
     * cible — 404 si non-membre (pas de fuite), 403 si rôle insuffisant.
     */
    private OrganisationMember requireAdminOfSameWorkspace(OrganisationMember target) {
        User caller = currentUser();
        OrganisationMember membership = organisationMemberRepository
                .findByOrganisationIdAndUserId(target.getOrganisation().getId(), caller.getId())
                .filter(member -> Boolean.FALSE.equals(member.getIsDeactivated()))
                .orElseThrow(() -> new ResourceNotFoundException("Membre introuvable."));
        if (membership.getOrgRole() != OrgRole.OWNER && membership.getOrgRole() != OrgRole.ADMIN) {
            throw new ForbiddenActionException("Action réservée au propriétaire et aux administrateurs.");
        }
        return membership;
    }

    private OrganisationMember requireMembership(UUID workspaceId) {
        User caller = currentUser();
        return organisationMemberRepository.findByOrganisationIdAndUserId(workspaceId, caller.getId())
                .filter(member -> Boolean.FALSE.equals(member.getIsDeactivated()))
                .orElseThrow(() -> new ResourceNotFoundException("Workspace introuvable."));
    }

    private User currentUser() {
        String email = SecurityUtils.getCurrentUserLogin()
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non authentifié."));
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
    }
}
