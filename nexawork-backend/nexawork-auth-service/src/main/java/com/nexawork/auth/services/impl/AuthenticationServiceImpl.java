package com.nexawork.auth.services.impl;

import com.nexawork.commons.exceptions.PasswordException;
import com.nexawork.commons.exceptions.ResourceAlreadyExistException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.commons.properties.JwtProperties;
import com.nexawork.commons.security.jwt.TokenProvider;
import com.nexawork.auth.dtos.requests.LoginRequest;
import com.nexawork.auth.dtos.requests.LogoutRequest;
import com.nexawork.auth.dtos.requests.PasswordResetConfirmRequest;
import com.nexawork.auth.dtos.requests.PasswordResetRequest;
import com.nexawork.auth.dtos.requests.RefreshTokenRequest;
import com.nexawork.auth.dtos.requests.RegisterRequest;
import com.nexawork.auth.dtos.requests.VerifyEmailRequest;
import com.nexawork.auth.dtos.responses.AuthResponse;
import com.nexawork.auth.entities.OrganisationMember;
import com.nexawork.auth.entities.RefreshToken;
import com.nexawork.auth.entities.User;
import com.nexawork.auth.entities.UserActionToken;
import com.nexawork.auth.entities.enums.ActionTokenType;
import com.nexawork.auth.entities.enums.OrgRole;
import com.nexawork.auth.mappers.UserMapper;
import com.nexawork.auth.repositories.OrganisationMemberRepository;
import com.nexawork.auth.repositories.RefreshTokenRepository;
import com.nexawork.auth.repositories.UserActionTokenRepository;
import com.nexawork.auth.repositories.UserRepository;
import com.nexawork.auth.security.rules.NexaWorkPermissions;
import com.nexawork.auth.services.AuthenticationService;
import com.nexawork.auth.services.EmailSender;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Identité et session JWT (§3, §13.1, §3.8) : BCrypt, access token 15 min,
 * refresh rotatif 7 j stocké en base, contexte workspace actif porté par le
 * refresh token (claim organisationId + support R20).
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationServiceImpl implements AuthenticationService {

    UserRepository userRepository;
    OrganisationMemberRepository organisationMemberRepository;
    RefreshTokenRepository refreshTokenRepository;
    UserActionTokenRepository userActionTokenRepository;
    UserMapper userMapper;
    TokenProvider tokenProvider;
    JwtProperties jwtProperties;
    PasswordEncoder passwordEncoder;
    AuthenticationManager authenticationManager;
    EmailSender emailSender;

    static final long RESET_TOKEN_VALIDITY_HOURS = 1;
    static final long VERIFICATION_TOKEN_VALIDITY_HOURS = 24;

    @Override
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new ResourceAlreadyExistException("Un compte existe déjà avec cet email.");
        }

        User user = User.builder()
                .email(request.getEmail().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .jobTitle(request.getJobTitle())
                .isActive(true)
                .emailVerified(false)
                .build();
        user = userRepository.save(user);

        UserActionToken verificationToken = createActionToken(user, ActionTokenType.EMAIL_VERIFICATION,
                VERIFICATION_TOKEN_VALIDITY_HOURS);
        emailSender.sendWelcomeEmail(user.getEmail(), user.getFirstName());
        emailSender.sendEmailVerification(user.getEmail(), user.getFirstName(), verificationToken.getToken());

        log.info("Nouveau compte créé : {}", user.getEmail());
        // Aucun workspace à l'inscription fondateur — le contexte viendra de la
        // première configuration (§3.3) via POST /workspaces puis refresh.
        return buildAuthResponse(user, null);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        User user = userRepository.findByEmailIgnoreCase(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Identifiants incorrects."));

        // §3.1 — workspace unique : contexte automatique ; sinon le client
        // passe par le sélecteur d'espaces puis /auth/refresh {workspaceId}.
        List<OrganisationMember> memberships = organisationMemberRepository.findAllByUserId(user.getId()).stream()
                .filter(member -> Boolean.FALSE.equals(member.getIsDeactivated()))
                .toList();
        OrganisationMember context = memberships.size() == 1 ? memberships.get(0) : null;

        return buildAuthResponse(user, context);
    }

    @Override
    public AuthResponse refresh(RefreshTokenRequest request) {
        RefreshToken current = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new BadCredentialsException("Refresh token inconnu."));

        if (Boolean.TRUE.equals(current.getRevoked()) || current.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadCredentialsException("Refresh token expiré ou révoqué.");
        }

        User user = current.getUser();

        // Contexte workspace : celui demandé (switch) ou celui déjà porté par la session
        UUID targetWorkspaceId = request.getWorkspaceId() != null
                ? request.getWorkspaceId()
                : current.getActiveOrganisationId();

        OrganisationMember context = null;
        if (targetWorkspaceId != null) {
            context = organisationMemberRepository.findByOrganisationIdAndUserId(targetWorkspaceId, user.getId())
                    .filter(member -> Boolean.FALSE.equals(member.getIsDeactivated()))
                    .orElseThrow(() -> new BadCredentialsException("Accès refusé à ce workspace."));
        }

        // Rotation : l'ancien token est révoqué, un nouveau est émis (§3.8)
        current.setRevoked(true);
        refreshTokenRepository.save(current);

        return buildAuthResponse(user, context);
    }

    @Override
    public void logout(LogoutRequest request) {
        refreshTokenRepository.findByToken(request.getRefreshToken())
                .ifPresent(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });
    }

    @Override
    public void requestPasswordReset(PasswordResetRequest request) {
        // Silence si aucun compte (§3.4) — pas de divulgation d'existence
        userRepository.findByEmailIgnoreCase(request.getEmail()).ifPresent(user -> {
            UserActionToken resetToken = createActionToken(user, ActionTokenType.PASSWORD_RESET,
                    RESET_TOKEN_VALIDITY_HOURS);
            emailSender.sendPasswordReset(user.getEmail(), user.getFirstName(), resetToken.getToken());
        });
    }

    @Override
    public void resetPassword(PasswordResetConfirmRequest request) {
        UserActionToken token = consumeActionToken(request.getToken(), ActionTokenType.PASSWORD_RESET);
        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        // Toutes les sessions existantes sont invalidées après un reset
        refreshTokenRepository.revokeAllByUserId(user.getId());
        log.info("Mot de passe réinitialisé pour {}", user.getEmail());
    }

    @Override
    public void verifyEmail(VerifyEmailRequest request) {
        UserActionToken token = consumeActionToken(request.getToken(), ActionTokenType.EMAIL_VERIFICATION);
        User user = token.getUser();
        // Changement d'email (§13.1 POST /users/me/email) : bascule de la
        // nouvelle adresse une fois prouvée par le clic sur le lien.
        if (user.getPendingEmail() != null) {
            user.setEmail(user.getPendingEmail());
            user.setPendingEmail(null);
        }
        user.setEmailVerified(true);
        userRepository.save(user);
        log.info("Email vérifié pour {}", user.getEmail());
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private AuthResponse buildAuthResponse(User user, OrganisationMember context) {
        UUID organisationId = context != null ? context.getOrganisation().getId() : null;
        OrgRole orgRole = context != null ? context.getOrgRole() : null;

        List<String> authorities = NexaWorkPermissions.forRole(orgRole).stream()
                .map(Enum::name)
                .toList();

        String accessToken = tokenProvider.createToken(
                user.getId(), user.getEmail(), user.getDisplayName(),
                organisationId, orgRole != null ? orgRole.name() : null,
                authorities);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiresAt(LocalDateTime.now().plusDays(jwtProperties.getRefreshTokenValidityInDays()))
                .revoked(false)
                .activeOrganisationId(organisationId)
                .build();
        refreshTokenRepository.save(refreshToken);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .activeWorkspaceId(organisationId)
                .user(userMapper.asDto(user))
                .build();
    }

    private UserActionToken createActionToken(User user, ActionTokenType type, long validityHours) {
        return userActionTokenRepository.save(UserActionToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .type(type)
                .expiresAt(LocalDateTime.now().plusHours(validityHours))
                .build());
    }

    private UserActionToken consumeActionToken(String tokenValue, ActionTokenType type) {
        UserActionToken token = userActionTokenRepository.findByTokenAndType(tokenValue, type)
                .orElseThrow(() -> new ResourceNotFoundException("Token invalide."));
        if (token.getUsedAt() != null) {
            throw new PasswordException("Ce lien a déjà été utilisé.");
        }
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new PasswordException("Ce lien a expiré.");
        }
        token.setUsedAt(LocalDateTime.now());
        return userActionTokenRepository.save(token);
    }
}
