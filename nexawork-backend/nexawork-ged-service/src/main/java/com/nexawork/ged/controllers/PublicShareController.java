package com.nexawork.ged.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.ged.dtos.responses.PublicShareFileResponse;
import com.nexawork.ged.dtos.responses.PublicShareResponse;
import com.nexawork.ged.services.SharedLinkService;
import com.nexawork.ged.services.SharedLinkService.DownloadedFile;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * Surface PUBLIQUE des liens de partage (Brique 4) — <b>accessible sans compte</b>.
 *
 * <p>Le préfixe {@code /api/v1/public/**} est ouvert à la fois par la Security du GED
 * (permitAll) et par la liste blanche de l'API Gateway. Aucune identité n'est requise :
 * le <b>token du lien</b> tient lieu d'autorisation, et toute la validation (expiration,
 * mot de passe, mode, portée) est faite côté service. Le mot de passe éventuel voyage
 * dans l'en-tête {@code X-Share-Password} (ou le paramètre {@code pw} en repli, pour un
 * téléchargement déclenché directement par le navigateur).</p>
 */
@RestController
@RequestMapping("/api/v1/public/shares")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PublicShareController {

    SharedLinkService sharedLinkService;

    /** Métadonnées + état du lien (ne révèle rien de sensible tant qu'il est verrouillé). */
    @GetMapping("/{token}")
    public Response<PublicShareResponse> resolve(@PathVariable String token,
                                                 @RequestHeader(value = "X-Share-Password", required = false) String pwdHeader,
                                                 @RequestParam(value = "pw", required = false) String pwdParam) {
        return Response.<PublicShareResponse>ok()
                .setPayload(sharedLinkService.resolve(token, firstNonBlank(pwdHeader, pwdParam)));
    }

    /** READ + cible fichier : télécharge le fichier ciblé (octets relayés). */
    @GetMapping("/{token}/download")
    public ResponseEntity<byte[]> downloadTarget(@PathVariable String token,
                                                 @RequestHeader(value = "X-Share-Password", required = false) String pwdHeader,
                                                 @RequestParam(value = "pw", required = false) String pwdParam) {
        return toDownload(sharedLinkService.downloadTargetFile(token, firstNonBlank(pwdHeader, pwdParam)));
    }

    /** READ + cible dossier : télécharge un fichier du dossier partagé (octets relayés). */
    @GetMapping("/{token}/files/{fileId}/download")
    public ResponseEntity<byte[]> downloadFolderFile(@PathVariable String token,
                                                     @PathVariable UUID fileId,
                                                     @RequestHeader(value = "X-Share-Password", required = false) String pwdHeader,
                                                     @RequestParam(value = "pw", required = false) String pwdParam) {
        return toDownload(sharedLinkService.downloadFolderFile(token, fileId, firstNonBlank(pwdHeader, pwdParam)));
    }

    /** DROP : dépôt d'un fichier par un externe (identité déclarée : nom + email). */
    @PostMapping("/{token}/upload")
    @ResponseStatus(HttpStatus.CREATED)
    public Response<PublicShareFileResponse> upload(@PathVariable String token,
                                                    @RequestPart("file") MultipartFile file,
                                                    @RequestParam(value = "name", required = false) String name,
                                                    @RequestParam(value = "email", required = false) String email,
                                                    @RequestHeader(value = "X-Share-Password", required = false) String pwdHeader,
                                                    @RequestParam(value = "pw", required = false) String pwdParam) {
        return Response.<PublicShareFileResponse>created()
                .setPayload(sharedLinkService.upload(token, file, name, email, firstNonBlank(pwdHeader, pwdParam)));
    }

    private ResponseEntity<byte[]> toDownload(DownloadedFile df) {
        String name = df.fileName() != null ? df.fileName() : "fichier";
        String contentType = df.contentType() != null ? df.contentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(name).build().toString())
                .contentType(MediaType.parseMediaType(contentType))
                .body(df.bytes());
    }

    private String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        return b != null && !b.isBlank() ? b : null;
    }
}
