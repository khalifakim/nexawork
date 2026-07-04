package com.nexawork.auth.security;

import com.nexawork.commons.properties.JwtProperties;
import com.nexawork.commons.security.SecurityUtils;
import com.nexawork.commons.security.jwt.TokenProvider;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

import java.util.Base64;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests unitaires TokenProvider (§E.7) : création, claims NexaWork, validation,
 * rejet des tokens falsifiés.
 */
class TokenProviderTest {

    private TokenProvider tokenProvider;
    private final UUID userId = UUID.randomUUID();
    private final UUID organisationId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties();
        // Secret de test : 64 octets encodés Base64 (HS512)
        properties.setBase64Secret(Base64.getEncoder().encodeToString(
                "nexawork-test-secret-key-of-sixty-four-bytes-minimum-for-hs512!!".getBytes()));
        properties.setTokenValidityInSeconds(900);
        tokenProvider = new TokenProvider(properties);
    }

    @Test
    void createToken_thenValidate_shouldSucceed() {
        String token = tokenProvider.createToken(userId, "khalif@nexawork.io", "Khalif Ba",
                organisationId, "OWNER", List.of("ALL_ACCESS", "READ_WORKSPACE"));

        assertThat(tokenProvider.validateToken(token)).isTrue();
    }

    @Test
    void createToken_shouldCarryNexaWorkClaims() {
        String token = tokenProvider.createToken(userId, "khalif@nexawork.io", "Khalif Ba",
                organisationId, "OWNER", List.of("ALL_ACCESS"));

        Claims claims = tokenProvider.parseClaims(token);
        assertThat(claims.getSubject()).isEqualTo("khalif@nexawork.io");
        assertThat(claims.get(SecurityUtils.CLAIM_USER_ID, String.class)).isEqualTo(userId.toString());
        assertThat(claims.get(SecurityUtils.CLAIM_ORGANISATION_ID, String.class)).isEqualTo(organisationId.toString());
        assertThat(claims.get(SecurityUtils.CLAIM_ORG_ROLE, String.class)).isEqualTo("OWNER");
        assertThat(claims.get(SecurityUtils.CLAIM_DISPLAY_NAME, String.class)).isEqualTo("Khalif Ba");
    }

    @Test
    void createToken_withoutWorkspaceContext_shouldOmitOrgClaims() {
        String token = tokenProvider.createToken(userId, "khalif@nexawork.io", "Khalif Ba",
                null, null, List.of("EDIT_PROFILE"));

        Claims claims = tokenProvider.parseClaims(token);
        assertThat(claims.get(SecurityUtils.CLAIM_ORGANISATION_ID)).isNull();
        assertThat(claims.get(SecurityUtils.CLAIM_ORG_ROLE)).isNull();
    }

    @Test
    void getAuthentication_shouldExposeAuthoritiesAndClaims() {
        String token = tokenProvider.createToken(userId, "khalif@nexawork.io", "Khalif Ba",
                organisationId, "ADMIN", List.of("READ_WORKSPACE", "EDIT_WORKSPACE"));

        Authentication authentication = tokenProvider.getAuthentication(token);

        assertThat(authentication.getName()).isEqualTo("khalif@nexawork.io");
        assertThat(authentication.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .containsExactlyInAnyOrder("READ_WORKSPACE", "EDIT_WORKSPACE");
        assertThat(authentication.getDetails()).isInstanceOf(Claims.class);
    }

    @Test
    void validateToken_shouldRejectTamperedToken() {
        String token = tokenProvider.createToken(userId, "khalif@nexawork.io", "Khalif Ba",
                organisationId, "MEMBER", List.of("READ_WORKSPACE"));

        String tampered = token.substring(0, token.length() - 4) + "abcd";
        assertThat(tokenProvider.validateToken(tampered)).isFalse();
    }

    @Test
    void validateToken_shouldRejectGarbage() {
        assertThat(tokenProvider.validateToken("not-a-jwt")).isFalse();
    }
}
