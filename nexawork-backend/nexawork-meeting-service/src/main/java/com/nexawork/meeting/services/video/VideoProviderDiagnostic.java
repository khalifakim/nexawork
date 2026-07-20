package com.nexawork.meeting.services.video;

/**
 * Résultat neutre du diagnostic d'un {@link VideoConferenceProvider} : rend visible
 * la configuration du fournisseur (identifiants, clé de signature, jeton d'exemple)
 * sans exposer au code métier les classes propres à une implémentation donnée.
 *
 * @param appId                identifiant d'application côté fournisseur
 * @param apiKeyId             identifiant de la clé de signature ({@code kid})
 * @param kidMatchesAppId      cohérence {@code kid}/{@code appId}
 * @param keySizeBits          taille de la clé RSA de signature, en bits
 * @param publicKeyFingerprint empreinte SHA-256 de la clé publique
 * @param publicKeyPem         clé publique au format PEM (comparable à la console)
 * @param sampleToken          jeton d'exemple (salle factice), pour inspection
 */
public record VideoProviderDiagnostic(
        String appId,
        String apiKeyId,
        boolean kidMatchesAppId,
        int keySizeBits,
        String publicKeyFingerprint,
        String publicKeyPem,
        String sampleToken) {
}
