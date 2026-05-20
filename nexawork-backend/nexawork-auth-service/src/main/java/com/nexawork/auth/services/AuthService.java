package com.nexawork.auth.services;

import com.nexawork.auth.dtos.requests.LoginRequest;
import com.nexawork.auth.dtos.requests.RegisterRequest;
import com.nexawork.auth.dtos.responses.AuthResponse;
import com.nexawork.auth.dtos.responses.UserResponse;
import com.nexawork.auth.entities.RefreshToken;
import com.nexawork.auth.entities.User;
import com.nexawork.auth.exceptions.ResourceAlreadyExistException;
import com.nexawork.auth.exceptions.ResourceNotFoundException;
import com.nexawork.auth.properties.JwtProperties;
import com.nexawork.auth.repositories.OrganisationMemberRepository;
import com.nexawork.auth.repositories.RefreshTokenRepository;
import com.nexawork.auth.repositories.UserRepository;
import com.nexawork.auth.security.jwt.TokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OrganisationMemberRepository memberRepository;
    private final TokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtProperties jwtProperties;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ResourceAlreadyExistException("Email déjà utilisé : " + request.email());
        }

        User user = User.builder()
            .email(request.email())
            .passwordHash(passwordEncoder.encode(request.password()))
            .displayName(request.displayName())
            .isActive(true)
            .build();

        userRepository.save(user);
        log.info("Utilisateur créé : {}", user.getEmail());

        return new UserResponse(user.getId(), user.getEmail(),
            user.getDisplayName(), user.getAvatarUrl(), user.getIsActive());
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email())
            .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));

        var memberships = memberRepository.findByUserId(user.getId());
        Long orgId = null;
        String orgRole = "MEMBER";
        if (!memberships.isEmpty()) {
            var m = memberships.get(0);
            orgId = m.getOrganisation().getId();
            orgRole = m.getOrgRole().name();
        }

        String accessToken = tokenProvider.createToken(auth, user.getId(),
            orgId, orgRole, user.getDisplayName());
        String refreshToken = createRefreshToken(user);

        return AuthResponse.of(accessToken, refreshToken,
            user.getId(), user.getEmail(), user.getDisplayName(), orgId, orgRole);
    }

    @Transactional
    public AuthResponse refresh(String refreshTokenValue) {
        RefreshToken stored = refreshTokenRepository.findByToken(refreshTokenValue)
            .orElseThrow(() -> new ResourceNotFoundException("Refresh token invalide"));

        if (stored.getRevoked() || stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ForbiddenTokenException("Refresh token expiré ou révoqué");
        }

        User user = stored.getUser();
        Authentication auth = new UsernamePasswordAuthenticationToken(user.getEmail(), null);

        var memberships = memberRepository.findByUserId(user.getId());
        Long orgId = null;
        String orgRole = "MEMBER";
        if (!memberships.isEmpty()) {
            var m = memberships.get(0);
            orgId = m.getOrganisation().getId();
            orgRole = m.getOrgRole().name();
        }

        String accessToken = tokenProvider.createToken(auth, user.getId(),
            orgId, orgRole, user.getDisplayName());

        return AuthResponse.of(accessToken, refreshTokenValue,
            user.getId(), user.getEmail(), user.getDisplayName(), orgId, orgRole);
    }

    @Transactional
    public void logout(String refreshTokenValue) {
        refreshTokenRepository.findByToken(refreshTokenValue)
            .ifPresent(t -> {
                t.setRevoked(true);
                refreshTokenRepository.save(t);
            });
    }

    private String createRefreshToken(User user) {
        String token = UUID.randomUUID().toString();
        RefreshToken rt = RefreshToken.builder()
            .user(user)
            .token(token)
            .expiresAt(LocalDateTime.now().plusDays(jwtProperties.getRefreshTokenValidityInDays()))
            .revoked(false)
            .build();
        refreshTokenRepository.save(rt);
        return token;
    }

    public static class ForbiddenTokenException extends RuntimeException {
        public ForbiddenTokenException(String msg) { super(msg); }
    }
}
