package com.nexawork.messaging.security;

import com.nexawork.commons.security.SecurityUtils;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * Pose l'identité STOMP (issue des attributs de session posés au handshake) dans
 * le {@code SecurityContext} sous forme de {@link Claims}, exactement comme le
 * filtre HTTP {@link GatewayIdentityFilter} — de sorte que {@code SecurityUtils}
 * et {@code CallerContext} fonctionnent à l'identique sur le chemin WebSocket.
 */
public final class StompIdentity {

    private StompIdentity() {
    }

    public static void apply(Object userId, Object orgId, Object orgRole) {
        if (userId == null) {
            return;
        }
        String uid = userId.toString();
        var claimsBuilder = Jwts.claims().subject(uid).add(SecurityUtils.CLAIM_USER_ID, uid);
        if (orgId != null) {
            claimsBuilder.add(SecurityUtils.CLAIM_ORGANISATION_ID, orgId.toString());
        }
        if (orgRole != null) {
            claimsBuilder.add(SecurityUtils.CLAIM_ORG_ROLE, orgRole.toString());
        }
        Claims claims = claimsBuilder.build();

        List<GrantedAuthority> authorities = orgRole != null && StringUtils.hasText(orgRole.toString())
                ? List.of(new SimpleGrantedAuthority("ROLE_" + orgRole))
                : List.of();

        var authentication = new UsernamePasswordAuthenticationToken(uid, null, authorities);
        authentication.setDetails(claims);
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
    }
}
