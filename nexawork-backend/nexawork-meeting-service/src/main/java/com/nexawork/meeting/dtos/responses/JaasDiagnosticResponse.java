package com.nexawork.meeting.dtos.responses;

import lombok.Builder;
import lombok.Data;

/**
 * Diagnostic de la configuration JaaS. Répond à la seule question qu'un
 * « Authentication failed » ne pose jamais explicitement : <b>le jeton que nous
 * signons est-il vérifiable par la clé publique enregistrée chez 8x8 ?</b>
 *
 * <p>Ne contient aucun secret : uniquement la clé <b>publique</b>, son empreinte,
 * et un jeton d'exemple (émis sur une salle factice) dont les claims peuvent être
 * comparés à la spécification JaaS.</p>
 */
@Data
@Builder
public class JaasDiagnosticResponse {

    /** Tenant JaaS (doit être le préfixe du kid). */
    private String appId;

    /** Identifiant de clé (en-tête `kid` du JWT) — à retrouver tel quel dans la console. */
    private String apiKeyId;

    /** `false` si le kid n'appartient pas à l'app : le jeton sera refusé. */
    private boolean kidMatchesAppId;

    private int keySizeBits;

    /** SHA-256 de la clé publique (DER). */
    private String publicKeyFingerprint;

    /** Clé publique PEM — à comparer avec celle enregistrée dans la console 8x8. */
    private String publicKeyPem;

    /** Heure du serveur : une dérive d'horloge fait rejeter `nbf`/`exp`. */
    private String serverTimeUtc;

    /** Jeton d'exemple, signé sur une salle factice — décodable sur jwt.io. */
    private String sampleToken;
}
