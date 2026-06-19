package com.nexawork.ged.controllers;

import com.nexawork.ged.dtos.requests.AddFileVersionRequest;
import com.nexawork.ged.dtos.requests.CreateFolderRequest;
import com.nexawork.ged.dtos.requests.GrantAccessRequest;
import com.nexawork.ged.dtos.responses.*;
import com.nexawork.ged.security.SecurityUtils;
import com.nexawork.ged.services.GedService;
import com.nexawork.ged.utils.Response;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "GED")
@RestController
@RequestMapping("/api/v1/ged")
@RequiredArgsConstructor
public class GedController {

    private final GedService gedService;

    // ── Dossiers ──────────────────────────────────────────────────────────────

    @Operation(summary = "Créer un dossier")
    @PostMapping("/folders")
    public ResponseEntity<Response<GedFolderResponse>> createFolder(
            @Valid @RequestBody CreateFolderRequest request) {
        Long orgId  = SecurityUtils.getCurrentOrganisationId().orElseThrow(() -> new RuntimeException("Organisation manquante"));
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Response.created(gedService.createFolder(request, orgId, userId), "Dossier créé"));
    }

    @Operation(summary = "Dossiers racine de l'organisation")
    @GetMapping("/folders")
    public ResponseEntity<Response<List<GedFolderResponse>>> listRoot() {
        Long orgId = SecurityUtils.getCurrentOrganisationId().orElseThrow(() -> new RuntimeException("Organisation manquante"));
        return ResponseEntity.ok(Response.ok(gedService.listRootFolders(orgId), "Dossiers récupérés"));
    }

    @Operation(summary = "Sous-dossiers")
    @GetMapping("/folders/{parentId}/children")
    public ResponseEntity<Response<List<GedFolderResponse>>> listChildren(@PathVariable Long parentId) {
        return ResponseEntity.ok(Response.ok(gedService.listSubFolders(parentId), "Sous-dossiers récupérés"));
    }

    @Operation(summary = "Dossiers d'un projet")
    @GetMapping("/projects/{projectId}/folders")
    public ResponseEntity<Response<List<GedFolderResponse>>> byProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(Response.ok(gedService.listByProject(projectId), "Dossiers projet récupérés"));
    }

    @Operation(summary = "Fichiers d'un dossier")
    @GetMapping("/folders/{folderId}/files")
    public ResponseEntity<Response<List<GedFileResponse>>> listFiles(@PathVariable Long folderId) {
        return ResponseEntity.ok(Response.ok(gedService.listFiles(folderId), "Fichiers récupérés"));
    }

    @Operation(summary = "Supprimer un dossier")
    @DeleteMapping("/folders/{folderId}")
    public ResponseEntity<Response<Void>> deleteFolder(@PathVariable Long folderId) {
        gedService.deleteFolder(folderId);
        return ResponseEntity.ok(Response.ok(null, "Dossier supprimé"));
    }

    // ── Versioning ────────────────────────────────────────────────────────────

    @Operation(summary = "Ajouter une nouvelle version d'un fichier GED")
    @PostMapping("/files/{fileId}/versions")
    public ResponseEntity<Response<GedFileVersionResponse>> addVersion(
            @PathVariable Long fileId,
            @Valid @RequestBody AddFileVersionRequest request) {
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Response.created(gedService.addVersion(fileId, request, userId), "Version ajoutée"));
    }

    @Operation(summary = "Historique des versions d'un fichier GED")
    @GetMapping("/files/{fileId}/versions")
    public ResponseEntity<Response<List<GedFileVersionResponse>>> listVersions(@PathVariable Long fileId) {
        return ResponseEntity.ok(Response.ok(gedService.listVersions(fileId), "Versions récupérées"));
    }

    @Operation(summary = "Envoyer en corbeille un fichier")
    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<Response<Void>> deleteFile(@PathVariable Long fileId) {
        gedService.deleteFile(fileId);
        return ResponseEntity.ok(Response.ok(null, "Fichier déplacé en corbeille"));
    }

    // ── Accès granulaires ─────────────────────────────────────────────────────

    @Operation(summary = "Accorder l'accès (FOLDER|FILE) à un utilisateur ou une équipe")
    @PostMapping("/grants")
    public ResponseEntity<Response<GedAccessGrantResponse>> grantAccess(
            @Valid @RequestBody GrantAccessRequest request) {
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Response.created(gedService.grantAccess(request, userId), "Accès accordé"));
    }

    @Operation(summary = "Lister les accès d'une cible (ex: FOLDER/42)")
    @GetMapping("/grants")
    public ResponseEntity<Response<List<GedAccessGrantResponse>>> listGrants(
            @RequestParam String targetType,
            @RequestParam Long targetId) {
        return ResponseEntity.ok(Response.ok(
            gedService.listGrantsForTarget(targetType, targetId), "Accès récupérés"));
    }

    @Operation(summary = "Lister les éléments partagés avec un utilisateur ou une équipe")
    @GetMapping("/grants/shared-with-me")
    public ResponseEntity<Response<List<GedAccessGrantResponse>>> sharedWithMe(
            @RequestParam String granteeType,
            @RequestParam Long granteeId) {
        return ResponseEntity.ok(Response.ok(
            gedService.listGrantsForGrantee(granteeType, granteeId), "Partages récupérés"));
    }
}
