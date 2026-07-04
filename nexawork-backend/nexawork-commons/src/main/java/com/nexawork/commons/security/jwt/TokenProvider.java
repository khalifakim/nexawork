package com.nexawork.commons.security.jwt;

import com.nexawork.commons.properties.JwtProperties;
import com.nexawork.commons.security.SecurityUtils;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.MacAlgorithm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Fournisseur de JWT cloné de Smart-Mifin, adapté NexaWork :
 * <ul>
 *   <li>JJWT 0.12.x — {@code Jwts.parser().verifyWith(...)} (au lieu de 0.11.x)</li>
 *   <li>claims NexaWork : userId, email (subject), organisationId, orgRole, displayName (V5.1 §14.9)</li>
 *   <li>HS512, secret Base64 injecté via {@code nexawork.jwt.base64-secret}</li>
 * </ul>
 */
@Slf4j
@Component
public class TokenProvider {

    private static final String AUTHORITIES_KEY = "auth";

    private final SecretKey key;

    private final MacAlgorithm signatureAlgorithm;

    private final JwtParser jwtParser;

    private final long tokenValidityInMilliseconds;

    public TokenProvider(JwtProperties jwtProperties) {
        byte[] keyBytes = Decoders.BASE64.decode(jwtProperties.getBase64Secret());
        this.key = Keys.hmacShaKeyFor(keyBytes);
        // HS512 (Smart-Mifin) exige une clé >= 512 bits (RFC 7518 §3.2) —
        // repli automatique sur l'algorithme le plus fort permis par la clé.
        if (keyBytes.length >= 64) {
            this.signatureAlgorithm = Jwts.SIG.HS512;
        } else if (keyBytes.length >= 48) {
            this.signatureAlgorithm = Jwts.SIG.HS384;
            log.warn("JWT_SECRET de {} octets — HS384 utilisé. Générez un secret de 64 octets pour HS512.", keyBytes.length);
        } else {
            this.signatureAlgorithm = Jwts.SIG.HS256;
            log.warn("JWT_SECRET de {} octets — HS256 utilisé. Générez un secret de 64 octets pour HS512.", keyBytes.length);
        }
        this.jwtParser = Jwts.parser().verifyWith(key).build();
        this.tokenValidityInMilliseconds = 1000 * jwtProperties.getTokenValidityInSeconds();
    }

    /**
     * Crée l'access token avec les claims NexaWork. {@code organisationId} et
     * {@code orgRole} sont nuls tant qu'aucun workspace actif n'est sélectionné
     * (ex. juste après le register, avant la première configuration).
     */
    public String createToken(UUID userId, String email, String displayName,
                              UUID organisationId, String orgRole,
                              Collection<String> authorities) {
        long now = new Date().getTime();
        Date validity = new Date(now + this.tokenValidityInMilliseconds);

        var builder = Jwts.builder()
                .subject(email)
                .claim(AUTHORITIES_KEY, String.join(",", authorities))
                .claim(SecurityUtils.CLAIM_USER_ID, userId.toString())
                .claim(SecurityUtils.CLAIM_DISPLAY_NAME, displayName)
                .issuedAt(new Date(now))
                .expiration(validity)
                .signWith(key, signatureAlgorithm);

        if (organisationId != null) {
            builder.claim(SecurityUtils.CLAIM_ORGANISATION_ID, organisationId.toString());
        }
        if (orgRole != null) {
            builder.claim(SecurityUtils.CLAIM_ORG_ROLE, orgRole);
        }
        return builder.compact();
    }

    public Authentication getAuthentication(String token) {
        Claims claims = parseClaims(token);

        Collection<? extends GrantedAuthority> authorities = Arrays
                .stream(claims.get(AUTHORITIES_KEY, String.class).split(","))
                .filter(auth -> !auth.trim().isEmpty())
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());

        User principal = new User(claims.getSubject(), "", authorities);

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(principal, token, authorities);
        // Les claims sont exposés via SecurityUtils (userId, organisationId, orgRole)
        authentication.setDetails(claims);
        return authentication;
    }

    public boolean validateToken(String authToken) {
        try {
            jwtParser.parseSignedClaims(authToken);
            return true;
        } catch (ExpiredJwtException e) {
            log.trace("Expired JWT token.", e);
        } catch (UnsupportedJwtException e) {
            log.trace("Unsupported JWT token.", e);
        } catch (MalformedJwtException e) {
            log.trace("Malformed JWT token.", e);
        } catch (io.jsonwebtoken.security.SignatureException e) {
            log.trace("Invalid JWT signature.", e);
        } catch (IllegalArgumentException e) {
            log.error("Token validation error {}", e.getMessage());
        }
        return false;
    }

    public Claims parseClaims(String token) {
        return jwtParser.parseSignedClaims(token).getPayload();
    }

    public List<String> getAuthorities(String token) {
        return Arrays.stream(parseClaims(token).get(AUTHORITIES_KEY, String.class).split(","))
                .filter(auth -> !auth.trim().isEmpty())
                .toList();
    }
}
