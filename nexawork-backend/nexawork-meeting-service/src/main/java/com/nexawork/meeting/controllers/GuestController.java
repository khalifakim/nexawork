package com.nexawork.meeting.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.meeting.dtos.responses.GuestAccessResponse;
import com.nexawork.meeting.dtos.responses.MeetingFileResponse;
import com.nexawork.meeting.services.GuestService;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * Accès invité externe (V5.1 §4.6). <b>Public</b> (non authentifié) : l'invité
 * n'a pas de compte, il présente son token à usage unique et reçoit un token JaaS
 * non modérateur pour rejoindre la salle.
 */
@RestController
@RequestMapping("/api/v1/guest")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GuestController {

    GuestService guestService;

    /** Résout un lien d'invité en accès à la salle (404 si token inconnu, 409 si réunion inactive). */
    @GetMapping("/{token}")
    public Response<GuestAccessResponse> access(@PathVariable String token) {
        return Response.<GuestAccessResponse>ok().setPayload(guestService.access(token));
    }

    // ─── Fichiers partagés (M5) : l'invité voit et fait exactement comme un membre ──
    // Il n'a pas de JWT : c'est son TOKEN d'invitation qui l'authentifie, et le
    // Meeting Service relaie les octets vers/depuis le File Service pour son compte.

    @GetMapping("/{token}/files")
    public Response<List<MeetingFileResponse>> files(@PathVariable String token) {
        return Response.<List<MeetingFileResponse>>ok().setPayload(guestService.files(token));
    }

    @PostMapping("/{token}/files")
    @ResponseStatus(HttpStatus.CREATED)
    public Response<MeetingFileResponse> shareFile(@PathVariable String token,
                                                   @RequestPart("file") MultipartFile file) {
        return Response.<MeetingFileResponse>created().setPayload(guestService.shareFile(token, file));
    }

    /** Téléchargement relayé : l'URL du File Service exigerait un JWT que l'invité n'a pas. */
    @GetMapping("/{token}/files/{fileId}/download")
    public ResponseEntity<byte[]> download(@PathVariable String token, @PathVariable UUID fileId) {
        byte[] bytes = guestService.downloadFile(token, fileId);
        String name = guestService.fileName(token, fileId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(name != null ? name : "fichier").build().toString())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bytes);
    }
}
