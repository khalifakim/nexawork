package com.nexawork.meeting.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Fichier partagé dans la salle, capté par le client via l'événement
 * {@code fileUploaded} de l'IFrame API JaaS (M5). Le binaire reste chez JaaS :
 * NexaWork n'en enregistre que les métadonnées.
 */
@Data
public class ShareMeetingFileRequest {

    /** Identifiant du fichier chez JaaS — sert à écarter les doublons. */
    @NotBlank
    @Size(max = 255)
    private String jaasFileId;

    @NotBlank
    @Size(max = 512)
    private String fileName;

    /** Taille en octets (facultative : l'événement ne la fournit pas toujours). */
    private Long fileSize;
}
