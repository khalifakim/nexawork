package com.nexawork.meeting.services;

import com.nexawork.meeting.properties.JitsiProperties;
import io.jsonwebtoken.Jwts;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class JitsiTokenService {

    private final JitsiProperties jitsiProperties;

    public String generateToken(String roomName, Long userId, String displayName,
                                String email, boolean isModerator) {
        return generateToken(roomName, userId, displayName, email, isModerator, false);
    }

    public String generateToken(String roomName, Long userId, String displayName,
                                String email, boolean isModerator, boolean lobbyBypass) {

        PrivateKey privateKey = loadPrivateKey(jitsiProperties.getPrivateKey());

        Map<String, Object> user = new HashMap<>();
        user.put("id", userId != null ? userId.toString() : "guest-" + System.currentTimeMillis());
        user.put("name", displayName);
        user.put("email", email != null ? email : "");
        user.put("avatar", "");
        user.put("moderator", String.valueOf(isModerator));
        user.put("lobby_bypass", String.valueOf(lobbyBypass));

        Map<String, Object> features = new HashMap<>();
        features.put("livestreaming", false);
        features.put("recording", false);
        features.put("transcription", false);
        features.put("outbound-call", false);

        Map<String, Object> context = new HashMap<>();
        context.put("user", user);
        context.put("features", features);

        long nowSeconds = System.currentTimeMillis() / 1000;

        return Jwts.builder()
            .header()
                .add("kid", jitsiProperties.getApiKeyId())
                .and()
            .issuer("chat")
            .subject(jitsiProperties.getAppId())
            .audience().add("jitsi").and()
            .claim("room", roomName)
            .claim("context", context)
            .issuedAt(new Date(nowSeconds * 1000))
            .notBefore(new Date(nowSeconds * 1000))
            .expiration(new Date((nowSeconds + 3600) * 1000))
            .signWith(privateKey)
            .compact();
    }

    private PrivateKey loadPrivateKey(String pemKey) {
        try {
            String stripped = pemKey
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                .replace("-----END RSA PRIVATE KEY-----", "")
                .replaceAll("\\\\n", "")
                .replaceAll("\\s+", "");
            byte[] keyBytes = Base64.getDecoder().decode(stripped);
            return KeyFactory.getInstance("RSA")
                .generatePrivate(new PKCS8EncodedKeySpec(keyBytes));
        } catch (Exception e) {
            throw new IllegalStateException(
                "Impossible de charger la clé privée JaaS RSA. " +
                "Vérifiez que JAAS_PRIVATE_KEY est bien définie et au format PKCS#8.", e);
        }
    }
}
