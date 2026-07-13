package com.nexawork.ged.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.ged.dtos.requests.ChangeAccessModeRequest;
import com.nexawork.ged.dtos.requests.CreateFolderRequest;
import com.nexawork.ged.dtos.requests.UpdateFolderRequest;
import com.nexawork.ged.dtos.responses.FolderContentResponse;
import com.nexawork.ged.dtos.responses.FolderResponse;
import com.nexawork.ged.services.GedAccessService;
import com.nexawork.ged.services.GedFolderService;
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
 * Dossiers GED (§13.4). Visibilité REF G (404), R12 (suppression), rejets sur le
 * dossier système TASK_ATTACHMENTS (403).
 */
@RestController
@RequestMapping("/api/v1/ged/folders")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GedFolderController {

    GedFolderService folderService;
    GedAccessService accessService;

    /** Racines d'un scope : {@code ?projectId=} pour une GED projet, absent pour l'organisation. */
    @GetMapping
    public Response<List<FolderResponse>> listRoots(@RequestParam(required = false) UUID projectId) {
        return Response.<List<FolderResponse>>ok().setPayload(folderService.listRootFolders(projectId));
    }

    /** Corbeille : dossiers supprimés par l'appelant (R11). */
    @GetMapping("/trash")
    public Response<List<FolderResponse>> trash() {
        return Response.<List<FolderResponse>>ok().setPayload(folderService.trashedFolders());
    }

    /** Restaure un dossier depuis la corbeille. */
    @PostMapping("/{id}/restore")
    public Response<FolderResponse> restore(@PathVariable UUID id) {
        return Response.<FolderResponse>ok().setPayload(folderService.restoreFolder(id));
    }

    /** Supprime définitivement un dossier de la corbeille. */
    @DeleteMapping("/trash/{id}")
    public Response<Void> purge(@PathVariable UUID id) {
        folderService.purgeFolder(id);
        return Response.deleted();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<FolderResponse> create(@Valid @RequestBody CreateFolderRequest request) {
        return Response.<FolderResponse>created().setPayload(folderService.createFolder(request));
    }

    @GetMapping("/{id}/content")
    public Response<FolderContentResponse> content(@PathVariable UUID id) {
        return Response.<FolderContentResponse>ok().setPayload(folderService.getContent(id));
    }

    @PatchMapping("/{id}")
    public Response<FolderResponse> update(@PathVariable UUID id,
                                           @Valid @RequestBody UpdateFolderRequest request) {
        return Response.<FolderResponse>ok().setPayload(folderService.updateFolder(id, request));
    }

    @DeleteMapping("/{id}")
    public Response<Void> delete(@PathVariable UUID id) {
        folderService.deleteFolder(id);
        return Response.deleted();
    }

    /** Bascule OPEN/PRIVATE/SHARED du dossier (§11.6). */
    @PatchMapping("/{id}/access")
    public Response<Void> changeAccessMode(@PathVariable UUID id,
                                           @Valid @RequestBody ChangeAccessModeRequest request) {
        accessService.changeFolderAccessMode(id, request);
        return Response.ok();
    }
}
