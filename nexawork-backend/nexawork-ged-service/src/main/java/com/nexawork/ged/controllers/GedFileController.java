package com.nexawork.ged.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.ged.dtos.requests.ChangeAccessModeRequest;
import com.nexawork.ged.dtos.requests.CreateFileRequest;
import com.nexawork.ged.dtos.requests.UpdateFileRequest;
import com.nexawork.ged.dtos.responses.FileResponse;
import com.nexawork.ged.services.GedAccessService;
import com.nexawork.ged.services.GedFileService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Fichiers GED (§13.4). Visibilité REF G (404), R12 (suppression), rejet d'ajout
 * dans le dossier système (403).
 */
@RestController
@RequestMapping("/api/v1/ged/files")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GedFileController {

    GedFileService fileService;
    GedAccessService accessService;

    /** Liste les fichiers d'un dossier : {@code ?folderId=}. */
    @GetMapping
    public Response<List<FileResponse>> listByFolder(@RequestParam UUID folderId) {
        return Response.<List<FileResponse>>ok().setPayload(fileService.listByFolder(folderId));
    }

    /**
     * Liste les fichiers à la racine d'un espace (sans dossier, V2). {@code ?projectId=}
     * absent = racine de l'espace Organisation, sinon racine de l'espace du projet.
     */
    @GetMapping("/root")
    public Response<List<FileResponse>> listRoot(@RequestParam(required = false) UUID projectId) {
        return Response.<List<FileResponse>>ok().setPayload(fileService.listRootFiles(projectId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<FileResponse> add(@Valid @RequestBody CreateFileRequest request) {
        return Response.<FileResponse>created().setPayload(fileService.addFile(request));
    }

    @GetMapping("/{id}")
    public Response<FileResponse> get(@PathVariable UUID id) {
        return Response.<FileResponse>ok().setPayload(fileService.getFile(id));
    }

    @PatchMapping("/{id}")
    public Response<FileResponse> update(@PathVariable UUID id,
                                         @Valid @RequestBody UpdateFileRequest request) {
        return Response.<FileResponse>ok().setPayload(fileService.updateFile(id, request));
    }

    @DeleteMapping("/{id}")
    public Response<Void> delete(@PathVariable UUID id) {
        fileService.deleteFile(id);
        return Response.deleted();
    }

    @PostMapping("/{id}/restore")
    public Response<FileResponse> restore(@PathVariable UUID id) {
        return Response.<FileResponse>ok().setPayload(fileService.restore(id));
    }

    /** Bascule OPEN/PRIVATE/SHARED du fichier (§11.6). */
    @PatchMapping("/{id}/access")
    public Response<Void> changeAccessMode(@PathVariable UUID id,
                                           @Valid @RequestBody ChangeAccessModeRequest request) {
        accessService.changeFileAccessMode(id, request);
        return Response.ok();
    }
}
