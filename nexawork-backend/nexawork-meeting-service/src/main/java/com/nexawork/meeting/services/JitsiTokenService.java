package com.nexawork.meeting.services;

import com.nexawork.meeting.properties.JitsiProperties;
import io.jsonwebtoken.Jwts;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.RSAPrivateCrtKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Génération des JWT JaaS signés en RS256 (V5.1 §9.9.4, §9.9.7.c). NexaWork ne
 * fournit que la signature ; JaaS valide avec la clé publique enregistrée. Le
 * {@code userId} de NexaWork est un UUID (adapté du code de référence en {@code Long}).
 *
 * <p><b>Diagnostic.</b> Un « Authentication failed » côté JaaS ne dit jamais
 * <i>pourquoi</i> : le jeton peut être parfaitement conforme et malgré tout refusé
 * si la clé publique enregistrée dans la console 8x8 n'est pas la jumelle de la clé
 * privée qui signe ici. Rien, dans le service, ne permettait de le voir. D'où
 * l'auto-contrôle au démarrage (§{@link #selfCheck()}) et {@link #publicKeyPem()} :
 * la clé publique publiée dans les logs est <b>directement comparable</b> à celle
 * de la console.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JitsiTokenService {

    private final JitsiProperties jitsiProperties;

    /** Durée de validité du token (1 h), aligné §9.9.4.b. */
    private static final long TOKEN_TTL_SECONDS = 3600;

    /**
     * Auto-contrôle au démarrage : rend visible, sans le moindre clic, tout ce qui
     * peut faire refuser un jeton par JaaS. Une clé absente ou laissée à sa valeur
     * d'exemple passait jusqu'ici totalement inaperçue — le service démarrait, et
     * l'échec ne se manifestait qu'au fond d'une iframe, dans le navigateur.
     */
    @PostConstruct
    void selfCheck() {
        String appId = jitsiProperties.getAppId();
        String kid = jitsiProperties.getApiKeyId();

        if (appId == null || appId.contains("changeme") || kid == null || kid.contains("changeme")) {
            log.error("JaaS NON CONFIGURÉ : app-id/api-key-id absents ou laissés à leur valeur d'exemple "
                    + "(app-id={}, kid={}). Toute réunion échouera sur « Authentication failed ».", appId, kid);
            return;
        }
        if (jitsiProperties.getPrivateKey() == null || jitsiProperties.getPrivateKey().isBlank()) {
            log.error("JaaS NON CONFIGURÉ : JAAS_PRIVATE_KEY est vide. Toute réunion échouera.");
            return;
        }
        // Le `kid` DOIT être de la forme {appId}/{clé}. Une paire incohérente
        // (kid d'une autre application) produit un jeton refusé sans autre indice.
        if (!kid.startsWith(appId + "/")) {
            log.error("JaaS INCOHÉRENT : le kid « {} » n'appartient pas à l'app « {} ». "
                    + "Le jeton sera refusé (kid attendu : {}/xxxxxx).", kid, appId, appId);
        }
        try {
            log.info("JaaS : app-id={} kid={} clé RSA {} bits, empreinte SHA-256 de la clé publique = {}",
                    appId, kid, keySizeBits(), publicKeyFingerprint());
            log.info("JaaS : clé publique dérivée de JAAS_PRIVATE_KEY — elle DOIT être celle enregistrée "
                    + "dans la console 8x8 pour ce kid, sinon « Authentication failed » :\n{}", publicKeyPem());
        } catch (Exception e) {
            log.error("JaaS : JAAS_PRIVATE_KEY illisible (format PKCS#8 attendu). Toute réunion échouera.", e);
        }
    }

    /** Empreinte SHA-256 de la clé publique (DER) — comparable d'un environnement à l'autre. */
    public String publicKeyFingerprint() {
        try {
            byte[] der = derivePublicKey().getEncoded();
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(der);
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            return "indisponible : " + e.getMessage();
        }
    }

    /** Clé publique au format PEM — à comparer telle quelle avec la console JaaS. */
    public String publicKeyPem() {
        try {
            String body = Base64.getMimeEncoder(64, new byte[]{'\n'})
                    .encodeToString(derivePublicKey().getEncoded());
            return "-----BEGIN PUBLIC KEY-----\n" + body + "\n-----END PUBLIC KEY-----";
        } catch (Exception e) {
            return "indisponible : " + e.getMessage();
        }
    }

    public int keySizeBits() {
        try {
            return ((RSAPrivateCrtKey) loadPrivateKey(jitsiProperties.getPrivateKey())).getModulus().bitLength();
        } catch (Exception e) {
            return -1;
        }
    }

    /**
     * Reconstruit la clé publique à partir de la clé privée. Une clé PKCS#8 RSA
     * porte le modulus et l'exposant public : la paire est donc déductible, et
     * c'est ce qui rend la comparaison avec la console possible sans rien stocker
     * de plus.
     */
    private PublicKey derivePublicKey() throws Exception {
        RSAPrivateCrtKey priv = (RSAPrivateCrtKey) loadPrivateKey(jitsiProperties.getPrivateKey());
        BigInteger modulus = priv.getModulus();
        BigInteger publicExponent = priv.getPublicExponent();
        return KeyFactory.getInstance("RSA").generatePublic(new RSAPublicKeySpec(modulus, publicExponent));
    }

    public String generateToken(String roomName, UUID userId, String displayName,
                                String email, boolean isModerator) {
        // Rétro-compat : sans précision, le contournement de salle d'attente suit
        // le statut de modérateur (l'hôte entre directement).
        return generateToken(roomName, userId, displayName, email, isModerator, isModerator);
    }

    /**
     * Génère un JWT JaaS (M3, V5.1 §14.5). {@code lobbyBypass} contrôle le claim
     * {@code context.user.lobby_bypass} : {@code true} pour l'hôte et les membres
     * conviés explicitement (accès direct à la salle), {@code false} pour l'invité
     * externe et le membre non convié (passage par la salle d'attente).
     */
    public String generateToken(String roomName, UUID userId, String displayName,
                                String email, boolean isModerator, boolean lobbyBypass) {
        PrivateKey privateKey = loadPrivateKey(jitsiProperties.getPrivateKey());

        Map<String, Object> user = new HashMap<>();
        user.put("id", userId != null ? userId.toString() : "guest");
        user.put("name", displayName);
        user.put("email", email != null ? email : "");
        user.put("avatar", "");
        user.put("moderator", String.valueOf(isModerator)); // "true" / "false" — chaîne (JaaS)
        // §14.5 : les porteurs de ce claim contournent la salle d'attente (lobby).
        user.put("lobby_bypass", lobbyBypass);

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
                // `single` et non `add` : JJWT sérialise une audience multiple en
                // TABLEAU (["jitsi"]), or JaaS exige la CHAÎNE "jitsi" et refuse
                // sinon la connexion (« Invalid 'aud' value. It should be 'jitsi' »).
                .audience().single("jitsi")              // valeur fixe JaaS
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
