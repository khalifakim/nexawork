package com.nexawork.meeting.services;

import com.nexawork.meeting.properties.JitsiProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class JitsiTokenService {

    private final JitsiProperties jitsiProperties;

    public String generateToken(String roomName, Long userId, String displayName,
                                String email, boolean isModerator) {
        SecretKey key = Keys.hmacShaKeyFor(
            jitsiProperties.getSecret().getBytes(StandardCharsets.UTF_8));

        Map<String, Object> context = new HashMap<>();
        Map<String, Object> user = new HashMap<>();
        user.put("id", userId != null ? userId.toString() : "guest");
        user.put("name", displayName);
        user.put("email", email);
        user.put("moderator", isModerator);
        context.put("user", user);

        return Jwts.builder()
            .issuer(jitsiProperties.getAppId())
            .subject("*")
            .audience().add(jitsiProperties.getAppId()).and()
            .claim("room", roomName)
            .claim("context", context)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + 3600_000))
            .signWith(key)
            .compact();
    }
}
