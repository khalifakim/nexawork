package com.nexawork.auth.services.impl;

import com.nexawork.commons.exceptions.ForbiddenActionException;
import com.nexawork.commons.exceptions.InvalidRequestException;
import com.nexawork.commons.exceptions.ResourceAlreadyExistException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.commons.properties.JwtProperties;
import com.nexawork.commons.security.SecurityUtils;
import com.nexawork.commons.security.jwt.TokenProvider;
import com.nexawork.auth.annotations.Journal;
import com.nexawork.auth.annotations.JournalAttribute;
import com.nexawork.auth.dtos.requests.AcceptInvitationRequest;
import com.nexawork.auth.dtos.requests.CreateInvitationsRequest;
import com.nexawork.auth.dtos.responses.AuthResponse;
import com.nexawork.auth.dtos.responses.InvitationContextResponse;
import com.nexawork.auth.dtos.responses.InvitationResponse;
import com.nexawork.auth.entities.Invitation;
import com.nexawork.auth.entities.Organisation;
import com.nexawork.auth.entities.OrganisationMember;
import com.nexawork.auth.entities.RefreshToken;
import com.nexawork.auth.entities.User;
import com.nexawork.auth.entities.enums.InvitationStatus;
import com.nexawork.auth.entities.enums.OrgRole;
import com.nexawork.auth.events.publishers.MemberInvitedEvent;
import com.nexawork.auth.events.publishers.MemberInvitedPublisher;
import com.nexawork.auth.mappers.InvitationMapper;
import com.nexawork.auth.mappers.UserMapper;
import com.nexawork.auth.repositories.InvitationRepository;
import com.nexawork.auth.repositories.OrganisationMemberRepository;
import com.nexawork.auth.repositories.RefreshTokenRepository;
import com.nexawork.auth.repositories.UserRepository;
import com.nexawork.auth.security.rules.NexaWorkPermissions;
import com.nexawork.auth.services.EmailSender;
import com.nexawork.auth.services.InvitationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Invitations (§13.1, §3.2, §4.1) : envoi multiple — chaque email crée une
 * ligne Invitation, un email transactionnel et un event `member.invited` ;
 * acceptation = création de compte + adhésion + session directe
 * (session.enterWorkspace côté client).
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class InvitationServiceImpl implements InvitationService {

    static final long INVITATION_VALIDITY_DAYS = 7;

    InvitationRepository invitationRepository;
    OrganisationMemberRepository organisationMemberRepository;
    UserRepository userRepository;
    RefreshTokenRepository refreshTokenRepository;
    InvitationMapper invitationMapper;
    UserMapper userMapper;
    EmailSender emailSender;
    MemberInvitedPublisher memberInvitedPublisher;
    PasswordEncoder passwordEncoder;
    TokenProvider tokenProvider;
    JwtProperties jwtProperties;

    @Override
    @Transactional(readOnly = true)
    public List<InvitationResponse> list(UUID workspaceId) {
        requireAdmin(workspaceId);
        // Une invitation acceptée n'est plus « en attente » : la personne est
        // membre et se gère désormais depuis Paramètres ▸ Membres.
        return invitationMapper.parse(
                invitationRepository.findAllByOrganisationIdAndStatusNot(workspaceId, InvitationStatus.ACCEPTED));
    }

    @Override
    @Journal(actionType = "INVITATIONS_SEND", entityName = "Invitation")
    public List<InvitationResponse> send(@JournalAttribute("workspaceId") UUID workspaceId,
                                         CreateInvitationsRequest request) {
        OrganisationMember caller = requireAdmin(workspaceId);
        Organisation organisation = caller.getOrganisation();

        if (request.getRole() == OrgRole.OWNER) {
            throw new InvalidRequestException("Le rôle OWNER n'est pas attribuable par invitation.");
        }

        Set<String> emails = new LinkedHashSet<>();
        request.getEmails().forEach(email -> emails.add(email.trim().toLowerCase()));

        List<Invitation> created = new ArrayList<>();
        for (String email : emails) {
            // Déjà membre ou déjà invité (PENDING) → ignoré, on continue le lot
            boolean alreadyMember = userRepository.findByEmailIgnoreCase(email)
                    .map(user -> organisationMemberRepository.existsByOrganisationIdAndUserId(
                            workspaceId, user.getId()))
                    .orElse(false);
            boolean alreadyInvited = invitationRepository
                    .existsByOrganisationIdAndEmailIgnoreCaseAndStatus(workspaceId, email, InvitationStatus.PENDING);
            if (alreadyMember || alreadyInvited) {
                log.info("Invitation ignorée pour {} (déjà membre ou déjà invité)", email);
                continue;
            }

            Invitation invitation = invitationRepository.save(Invitation.builder()
                    .organisation(organisation)
                    .email(email)
                    .token(UUID.randomUUID().toString())
                    .status(InvitationStatus.PENDING)
                    .expiresAt(LocalDateTime.now().plusDays(INVITATION_VALIDITY_DAYS))
                    .role(request.getRole())
                    .invitedBy(caller.getUser())
                    .build());
            created.add(invitation);

            emailSender.sendWorkspaceInvitation(email, caller.getUser().getDisplayName(),
                    organisation.getName(), invitation.getToken());
            memberInvitedPublisher.publish(new MemberInvitedEvent(
                    organisation.getId(), organisation.getName(), email,
                    caller.getUser().getDisplayName(), invitation.getToken()));
        }
        return invitationMapper.parse(created);
    }

    @Override
    public InvitationResponse resend(UUID invitationId) {
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation introuvable."));
        OrganisationMember caller = requireAdmin(invitation.getOrganisation().getId());

        if (invitation.getStatus() == InvitationStatus.ACCEPTED) {
            throw new InvalidRequestException("Cette invitation a déjà été acceptée.");
        }

        invitation.setStatus(InvitationStatus.PENDING);
        invitation.setExpiresAt(LocalDateTime.now().plusDays(INVITATION_VALIDITY_DAYS));
        invitationRepository.save(invitation);

        emailSender.sendWorkspaceInvitation(invitation.getEmail(), caller.getUser().getDisplayName(),
                invitation.getOrganisation().getName(), invitation.getToken());
        return invitationMapper.asDto(invitation);
    }

    @Override
    @Journal(actionType = "INVITATION_CANCEL", entityName = "Invitation")
    public void cancel(@JournalAttribute("invitationId") UUID invitationId) {
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation introuvable."));
        requireAdmin(invitation.getOrganisation().getId());

        if (invitation.getStatus() == InvitationStatus.ACCEPTED) {
            throw new InvalidRequestException("Cette invitation a déjà été acceptée.");
        }
        invitationRepository.delete(invitation);
    }

    @Override
    @Transactional(readOnly = true)
    public InvitationContextResponse getContext(String token) {
        Invitation invitation = findPendingByToken(token);
        Organisation organisation = invitation.getOrganisation();
        return InvitationContextResponse.builder()
                .workspaceName(organisation.getName())
                .workspaceColor(organisation.getColor())
                .inviterDisplayName(invitation.getInvitedBy() != null
                        ? invitation.getInvitedBy().getDisplayName() : null)
                .email(invitation.getEmail())
                .role(invitation.getRole())
                .memberCount(organisationMemberRepository.countByOrganisationId(organisation.getId()))
                .accountExists(userRepository.existsByEmailIgnoreCase(invitation.getEmail()))
                .build();
    }

    @Override
    @Journal(actionType = "INVITATION_ACCEPT", entityName = "Invitation")
    public AuthResponse accept(String token, AcceptInvitationRequest request) {
        Invitation invitation = findPendingByToken(token);
        Organisation organisation = invitation.getOrganisation();

        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new ResourceAlreadyExistException(
                    "Un compte existe déjà avec cet email — connectez-vous puis utilisez le lien d'invitation.");
        }

        // L'email de connexion peut différer de l'email d'invitation (§3.2) ;
        // le lien reçu prouve uniquement l'adresse d'invitation.
        User user = userRepository.save(User.builder()
                .email(request.getEmail().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .jobTitle(request.getJobTitle())
                .isActive(true)
                .emailVerified(request.getEmail().equalsIgnoreCase(invitation.getEmail()))
                .build());

        OrganisationMember membership = organisationMemberRepository.save(OrganisationMember.builder()
                .organisation(organisation)
                .user(user)
                .orgRole(invitation.getRole())
                .isOwner(false)
                .isDeactivated(false)
                .joinedAt(LocalDateTime.now())
                .build());

        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitationRepository.save(invitation);

        log.info("Invitation acceptée : {} rejoint {} en {}", user.getEmail(),
                organisation.getName(), invitation.getRole());

        // §3.2 — entrée directe dans le workspace ciblé (session.enterWorkspace)
        return buildAuthResponse(user, membership);
    }

    @Override
    @Journal(actionType = "INVITATION_JOIN", entityName = "Invitation")
    public AuthResponse join(@JournalAttribute("token") String token) {
        Invitation invitation = findPendingByToken(token);
        Organisation organisation = invitation.getOrganisation();

        String email = SecurityUtils.getCurrentUserLogin()
                .orElseThrow(() -> new ForbiddenActionException("Authentification requise pour rejoindre l'espace."));
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));

        // L'utilisateur connecté doit être le destinataire de l'invitation.
        if (!user.getEmail().equalsIgnoreCase(invitation.getEmail())) {
            throw new ForbiddenActionException(
                    "Cette invitation ne correspond pas à votre compte. Connectez-vous avec "
                    + invitation.getEmail() + ".");
        }

        // Idempotent : déjà membre → on réutilise l'adhésion existante.
        OrganisationMember membership = organisationMemberRepository
                .findByOrganisationIdAndUserId(organisation.getId(), user.getId())
                .orElseGet(() -> organisationMemberRepository.save(OrganisationMember.builder()
                        .organisation(organisation)
                        .user(user)
                        .orgRole(invitation.getRole())
                        .isOwner(false)
                        .isDeactivated(false)
                        .joinedAt(LocalDateTime.now())
                        .build()));

        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitationRepository.save(invitation);

        log.info("Invitation rejointe (compte existant) : {} rejoint {} en {}", user.getEmail(),
                organisation.getName(), invitation.getRole());

        return buildAuthResponse(user, membership);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private Invitation findPendingByToken(String token) {
        Invitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation introuvable."));
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new ResourceNotFoundException("Cette invitation n'est plus valide.");
        }
        if (invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            invitationRepository.save(invitation);
            throw new ResourceNotFoundException("Cette invitation a expiré.");
        }
        return invitation;
    }

    private OrganisationMember requireAdmin(UUID workspaceId) {
        String email = SecurityUtils.getCurrentUserLogin()
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non authentifié."));
        User caller = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
        OrganisationMember membership = organisationMemberRepository
                .findByOrganisationIdAndUserId(workspaceId, caller.getId())
                .filter(member -> Boolean.FALSE.equals(member.getIsDeactivated()))
                .orElseThrow(() -> new ResourceNotFoundException("Workspace introuvable."));
        if (membership.getOrgRole() != OrgRole.OWNER && membership.getOrgRole() != OrgRole.ADMIN) {
            throw new ForbiddenActionException("Action réservée au propriétaire et aux administrateurs.");
        }
        return membership;
    }

    private AuthResponse buildAuthResponse(User user, OrganisationMember context) {
        UUID organisationId = context.getOrganisation().getId();
        OrgRole orgRole = context.getOrgRole();

        List<String> authorities = NexaWorkPermissions.forRole(orgRole).stream()
                .map(Enum::name)
                .toList();

        String accessToken = tokenProvider.createToken(
                user.getId(), user.getEmail(), user.getDisplayName(),
                organisationId, orgRole.name(), authorities);

        RefreshToken refreshToken = refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiresAt(LocalDateTime.now().plusDays(jwtProperties.getRefreshTokenValidityInDays()))
                .revoked(false)
                .activeOrganisationId(organisationId)
                .build());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .activeWorkspaceId(organisationId)
                .user(userMapper.asDto(user))
                .build();
    }
}
