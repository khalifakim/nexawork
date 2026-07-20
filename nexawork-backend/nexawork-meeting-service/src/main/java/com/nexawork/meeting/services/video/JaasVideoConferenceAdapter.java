package com.nexawork.meeting.services.video;

import com.nexawork.meeting.properties.JitsiProperties;
import com.nexawork.meeting.services.JitsiTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Adaptateur JaaS (8x8) du port {@link VideoConferenceProvider}. Seul point du
 * service qui connaît les spécificités de JaaS : la génération du JWT RS256
 * (déléguée à {@link JitsiTokenService}), l'assemblage de l'URL
 * {@code 8x8.vc/appId/room} et la lecture du bloc de configuration
 * {@code nexawork.jaas} ({@link JitsiProperties}).
 *
 * <p>Substituer le fournisseur — par exemple une instance Jitsi auto-hébergée —
 * revient à fournir un autre adaptateur implémentant le même port, sans toucher
 * ni au code métier des réunions ni aux autres services.</p>
 */
@Service
@RequiredArgsConstructor
public class JaasVideoConferenceAdapter implements VideoConferenceProvider {

    private final JitsiTokenService tokenService;
    private final JitsiProperties jitsiProperties;

    @Override
    public String providerName() {
        return "JaaS (Jitsi as a Service)";
    }

    @Override
    public String issueAccessToken(RoomAccess a) {
        return tokenService.generateToken(a.roomName(), a.userId(), a.displayName(),
                a.email(), a.moderator(), a.lobbyBypass());
    }

    @Override
    public String buildRoomUrl(String roomName, String accessToken) {
        if (accessToken == null) {
            return null;
        }
        return jitsiProperties.getUrl() + "/" + jitsiProperties.getAppId()
                + "/" + roomName + "?jwt=" + accessToken;
    }

    @Override
    public VideoProviderDiagnostic diagnostic(RoomAccess sample) {
        String appId = jitsiProperties.getAppId();
        String kid = jitsiProperties.getApiKeyId();
        return new VideoProviderDiagnostic(
                appId,
                kid,
                appId != null && kid != null && kid.startsWith(appId + "/"),
                tokenService.keySizeBits(),
                tokenService.publicKeyFingerprint(),
                tokenService.publicKeyPem(),
                issueAccessToken(sample));
    }
}
