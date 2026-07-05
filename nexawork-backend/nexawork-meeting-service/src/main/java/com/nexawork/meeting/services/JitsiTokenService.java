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
import java.util.UUID;

/**
 * Génération des JWT JaaS signés en RS256 (V5.1 §9.9.4, §9.9.7.c). NexaWork ne
 * fournit que la signature ; JaaS valide avec la clé publique enregistrée. Le
 * {@code userId} de NexaWork est un UUID (adapté du code de référence en {@code Long}).
 */
@Service
@RequiredArgsConstructor
public class JitsiTokenService {

    private final JitsiProperties jitsiProperties;

    /** Durée de validité du token (1 h), aligné §9.9.4.b. */
    private static final long TOKEN_TTL_SECONDS = 3600;

    public String generateToken(String roomName, UUID userId, String displayName,
                                String email, boolean isModerator) {
        PrivateKey privateKey = loadPrivateKey(jitsiProperties.getPrivateKey());

        Map<String, Object> user = new HashMap<>();
        user.put("id", userId != null ? userId.toString() : "guest");
        user.put("name", displayName);
        user.put("email", email != null ? email : "");
        user.put("avatar", "");
        user.put("moderator", String.valueOf(isModerator)); // "true" / "false" — chaîne (JaaS)

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
                .header().add("kid", jitsiProperties.getApiKeyId()).and()
                .issuer("chat")                          // valeur fixe JaaS
                .subject(jitsiProperties.getAppId())     // Tenant ID
                .audience().add("jitsi").and()           // valeur fixe JaaS
                .claim("room", roomName)
                .claim("context", context)
                .issuedAt(new Date(nowSeconds * 1000))
                .notBefore(new Date(nowSeconds * 1000))
                .expiration(new Date((nowSeconds + TOKEN_TTL_SECONDS) * 1000))
                .signWith(privateKey)                    // RS256 auto-détecté (clé RSA)
                .compact();
    }

    /** Charge la clé PKCS#8 depuis la chaîne PEM stockée dans .env (avec \n littéraux). */
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
                    "Impossible de charger la clé privée JaaS RSA. "
                    + "Vérifier que JAAS_PRIVATE_KEY est bien définie et au format PKCS#8.", e);
        }
    }
}
