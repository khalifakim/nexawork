package com.nexawork.auth.services;

import com.nexawork.auth.dtos.requests.CreateOrganisationRequest;
import com.nexawork.auth.dtos.requests.InviteMemberRequest;
import com.nexawork.auth.dtos.requests.UpdateMemberRoleRequest;
import com.nexawork.auth.dtos.responses.MemberResponse;
import com.nexawork.auth.dtos.responses.OrganisationResponse;
import com.nexawork.auth.entities.*;
import com.nexawork.auth.entities.enums.InvitationStatus;
import com.nexawork.auth.entities.enums.OrgRole;
import com.nexawork.auth.events.publishers.MemberInvitedEvent;
import com.nexawork.auth.events.publishers.MemberInvitedEventPublisher;
import com.nexawork.auth.exceptions.ForbiddenActionException;
import com.nexawork.auth.exceptions.ResourceAlreadyExistException;
import com.nexawork.auth.exceptions.ResourceNotFoundException;
import com.nexawork.auth.repositories.*;
import com.nexawork.auth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrganisationService {

    private final OrganisationRepository orgRepo;
    private final OrganisationMemberRepository memberRepo;
    private final UserRepository userRepo;
    private final InvitationRepository invitationRepo;
    private final MemberInvitedEventPublisher eventPublisher;

    @Transactional
    public OrganisationResponse create(CreateOrganisationRequest request) {
        String currentEmail = SecurityUtils.getCurrentUserLogin()
            .orElseThrow(() -> new RuntimeException("Non authentifié"));

        User creator = userRepo.findByEmail(currentEmail)
            .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));

        String slug = generateSlug(request.name());
        if (orgRepo.existsBySlug(slug)) {
            slug = slug + "-" + UUID.randomUUID().toString().substring(0, 6);
        }

        Organisation org = Organisation.builder()
            .name(request.name())
            .slug(slug)
            .build();
        orgRepo.save(org);

        OrganisationMember owner = OrganisationMember.builder()
            .organisation(org)
            .user(creator)
            .orgRole(OrgRole.OWNER)
            .isOwner(true)
            .joinedAt(LocalDateTime.now())
            .build();
        memberRepo.save(owner);

        return new OrganisationResponse(org.getId(), org.getName(), org.getSlug(), org.getLogoUrl());
    }

    @Transactional(readOnly = true)
    public OrganisationResponse findById(Long id) {
        Organisation org = orgRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Organisation introuvable : " + id));
        return new OrganisationResponse(org.getId(), org.getName(), org.getSlug(), org.getLogoUrl());
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> listMembers(Long orgId) {
        return memberRepo.findByOrganisationId(orgId).stream()
            .map(m -> new MemberResponse(
                m.getId(), m.getUser().getId(), m.getUser().getEmail(),
                m.getUser().getDisplayName(), m.getUser().getAvatarUrl(),
                m.getOrgRole(), m.getJoinedAt()))
            .collect(Collectors.toList());
    }

    @Transactional
    public void inviteMember(Long orgId, InviteMemberRequest request, String inviterEmail) {
        Organisation org = orgRepo.findById(orgId)
            .orElseThrow(() -> new ResourceNotFoundException("Organisation introuvable : " + orgId));

        User inviter = userRepo.findByEmail(inviterEmail)
            .orElseThrow(() -> new ResourceNotFoundException("Inviteur introuvable"));

        if (invitationRepo.existsByOrganisationIdAndEmailAndStatus(
                orgId, request.email(), InvitationStatus.PENDING)) {
            throw new ResourceAlreadyExistException("Invitation déjà en attente pour : " + request.email());
        }

        String token = UUID.randomUUID().toString();
        Invitation invitation = Invitation.builder()
            .organisation(org)
            .email(request.email())
            .token(token)
            .status(InvitationStatus.PENDING)
            .expiresAt(LocalDateTime.now().plusDays(7))
            .build();
        invitationRepo.save(invitation);

        eventPublisher.publish(new MemberInvitedEvent(
            orgId, org.getName(), request.email(),
            inviter.getDisplayName(), token
        ));
    }

    @Transactional
    public String acceptInvitation(String token) {
        Invitation invitation = invitationRepo.findByToken(token)
            .orElseThrow(() -> new ResourceNotFoundException("Invitation invalide"));

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new ForbiddenActionException("Invitation déjà utilisée ou expirée");
        }
        if (invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            invitationRepo.save(invitation);
            throw new ForbiddenActionException("Invitation expirée");
        }

        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitationRepo.save(invitation);

        userRepo.findByEmail(invitation.getEmail()).ifPresent(user -> {
            if (!memberRepo.existsByOrganisationIdAndUserId(
                    invitation.getOrganisation().getId(), user.getId())) {
                OrganisationMember member = OrganisationMember.builder()
                    .organisation(invitation.getOrganisation())
                    .user(user)
                    .orgRole(OrgRole.MEMBER)
                    .isOwner(false)
                    .joinedAt(LocalDateTime.now())
                    .build();
                memberRepo.save(member);
            }
        });

        return "Invitation acceptée avec succès";
    }

    @Transactional
    public void updateMemberRole(Long orgId, Long userId, UpdateMemberRoleRequest request,
                                  String requesterEmail) {
        User requester = userRepo.findByEmail(requesterEmail)
            .orElseThrow(() -> new ResourceNotFoundException("Requérant introuvable"));

        boolean isAdminOrOwner = memberRepo.existsByOrganisationIdAndUserIdAndOrgRoleIn(
            orgId, requester.getId(), List.of(OrgRole.OWNER, OrgRole.ADMIN));
        if (!isAdminOrOwner) {
            throw new ForbiddenActionException("Droits insuffisants pour modifier les rôles");
        }

        OrganisationMember member = memberRepo.findByOrganisationIdAndUserId(orgId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Membre introuvable"));

        member.setOrgRole(request.role());
        memberRepo.save(member);
    }

    @Transactional
    public void removeMember(Long orgId, Long userId, String requesterEmail) {
        User requester = userRepo.findByEmail(requesterEmail)
            .orElseThrow(() -> new ResourceNotFoundException("Requérant introuvable"));

        boolean isAdminOrOwner = memberRepo.existsByOrganisationIdAndUserIdAndOrgRoleIn(
            orgId, requester.getId(), List.of(OrgRole.OWNER, OrgRole.ADMIN));
        if (!isAdminOrOwner) {
            throw new ForbiddenActionException("Droits insuffisants");
        }

        OrganisationMember member = memberRepo.findByOrganisationIdAndUserId(orgId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Membre introuvable"));
        memberRepo.delete(member);
    }

    private String generateSlug(String name) {
        String normalized = Normalizer.normalize(name, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(normalized).replaceAll("")
            .toLowerCase()
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-|-$", "");
    }
}
