package com.nexawork.gateway.security.jwt;

import com.nexawork.gateway.properties.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Optional;

/**
 * Valideur JWT autonome du gateway : réplique la logique de vérification de
 * {@code com.nexawork.commons.security.jwt.TokenProvider} (même secret HMAC
 * Base64, mêmes claims NexaWork), mais sans aucune dépendance Spring Security
 * servlet — le gateway est réactif.
 *
 * <p>Le secret partagé garantit que tout token émis par l'Auth Service est
 * accepté ici, et réciproquement qu'un token forgé sans le secret est rejeté.</p>
 */
@Slf4j
@Component
public class JwtTokenValidator {

    private final JwtParser jwtParser;

    public JwtTokenValidator(JwtProperties jwtProperties) {
        byte[] keyBytes = Decoders.BASE64.decode(jwtProperties.getBase64Secret());
        SecretKey key = Keys.hmacShaKeyFor(keyBytes);
        // Le parser vérifie signature + expiration ; l'algorithme (HS256/384/512)
        // est déduit de l'en-tête du token, cohérent avec la clé côté Auth Service.
        this.jwtParser = Jwts.parser().verifyWith(key).build();
    }

    /**
     * Vérifie la signature et l'expiration, puis renvoie les claims.
     *
     * @return les claims si le token est valide, {@link Optional#empty()} sinon
     *         (signature invalide, expiré, malformé, secret erroné...).
     */
    public Optional<Claims> validateAndParse(String token) {
        try {
            return Optional.of(jwtParser.parseSignedClaims(token).getPayload());
        } catch (Exception e) {
            log.trace("JWT rejeté : {}", e.getMessage());
            return Optional.empty();
        }
    }
}
