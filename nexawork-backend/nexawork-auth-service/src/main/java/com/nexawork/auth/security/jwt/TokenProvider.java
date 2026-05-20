package com.nexawork.auth.security.jwt;

import com.nexawork.auth.properties.JwtProperties;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.SecretKey;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
public class TokenProvider {

    private static final String AUTHORITIES_KEY = "auth";
    private static final String USER_ID         = "userId";
    private static final String ORGANISATION_ID = "organisationId";
    private static final String ORG_ROLE        = "orgRole";
    private static final String DISPLAY_NAME    = "displayName";

    private final SecretKey key;
    private final JwtParser jwtParser;
    private final long tokenValidityMs;

    public TokenProvider(JwtProperties props) {
        byte[] keyBytes = Decoders.BASE64.decode(props.getBase64Secret());
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.jwtParser = Jwts.parser().verifyWith(key).build();
        this.tokenValidityMs = props.getTokenValidityInSeconds() * 1000L;
    }

    public String createToken(Authentication auth, Long userId,
                              Long organisationId, String orgRole, String displayName) {
        String authorities = auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.joining(","));

        Date validity = new Date(System.currentTimeMillis() + tokenValidityMs);

        return Jwts.builder()
            .subject(auth.getName())
            .claim(USER_ID, userId)
            .claim(ORGANISATION_ID, organisationId)
            .claim(ORG_ROLE, orgRole)
            .claim(DISPLAY_NAME, displayName)
            .claim(AUTHORITIES_KEY, authorities)
            .expiration(validity)
            .signWith(key)
            .compact();
    }

    public Authentication getAuthentication(String token) {
        Claims claims = jwtParser.parseSignedClaims(token).getPayload();

        List<GrantedAuthority> authorities = Arrays
            .stream(claims.get(AUTHORITIES_KEY, String.class).split(","))
            .filter(StringUtils::hasText)
            .map(SimpleGrantedAuthority::new)
            .collect(Collectors.toList());

        User principal = new User(claims.getSubject(), "", authorities);
        return new UsernamePasswordAuthenticationToken(principal, token, authorities);
    }

    public boolean validateToken(String token) {
        try {
            jwtParser.parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Invalid JWT: {}", e.getMessage());
            return false;
        }
    }
}
