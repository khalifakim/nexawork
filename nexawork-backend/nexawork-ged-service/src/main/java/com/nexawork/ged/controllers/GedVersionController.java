package com.nexawork.ged.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.ged.dtos.requests.CreateVersionRequest;
import com.nexawork.ged.dtos.responses.VersionResponse;
import com.nexawork.ged.services.GedVersionService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Versions d'un fichier GED (§13.4, §11.5). Lecture selon REF G ; ajout/restore
 * réservés propriétaire/éditeur/ADMIN (R13).
 */
@RestController
@RequestMapping("/api/v1/ged/files/{fileId}/versions")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GedVersionController {

    GedVersionService versionService;

    @GetMapping
    public Response<List<VersionResponse>> list(@PathVariable UUID fileId) {
        return Response.<List<VersionResponse>>ok().setPayload(versionService.listVersions(fileId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<VersionResponse> add(@PathVariable UUID fileId,
                                         @Valid @RequestBody CreateVersionRequest request) {
        return Response.<VersionResponse>created().setPayload(versionService.addVersion(fileId, request));
    }

    @PostMapping("/{versionId}/restore")
    public Response<VersionResponse> restore(@PathVariable UUID fileId, @PathVariable UUID versionId) {
        return Response.<VersionResponse>ok().setPayload(versionService.restoreVersion(fileId, versionId));
    }
}
