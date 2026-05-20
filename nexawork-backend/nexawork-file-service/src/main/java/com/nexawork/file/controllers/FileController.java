package com.nexawork.file.controllers;

import com.nexawork.file.dtos.responses.FileResponse;
import com.nexawork.file.security.SecurityUtils;
import com.nexawork.file.services.FileStorageService;
import com.nexawork.file.utils.Response;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "Files")
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    @Operation(summary = "Uploader un fichier")
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<Response<FileResponse>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long taskId) {
        Long userId = SecurityUtils.getCurrentUserId().orElseThrow(() -> new RuntimeException("Non authentifié"));
        Long orgId  = SecurityUtils.getCurrentOrganisationId().orElse(null);
        FileResponse response = fileStorageService.upload(file, userId, orgId, projectId, taskId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Response.created(response, "Fichier uploadé"));
    }

    @Operation(summary = "URL de téléchargement (60 min)")
    @GetMapping("/{id}/download-url")
    public ResponseEntity<Response<String>> downloadUrl(@PathVariable Long id) {
        return ResponseEntity.ok(Response.ok(fileStorageService.getDownloadUrl(id), "URL générée"));
    }

    @Operation(summary = "Fichiers d'un projet")
    @GetMapping("/project/{projectId}")
    public ResponseEntity<Response<List<FileResponse>>> byProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(Response.ok(fileStorageService.findByProject(projectId), "Fichiers récupérés"));
    }

    @Operation(summary = "Fichiers d'une tâche")
    @GetMapping("/task/{taskId}")
    public ResponseEntity<Response<List<FileResponse>>> byTask(@PathVariable Long taskId) {
        return ResponseEntity.ok(Response.ok(fileStorageService.findByTask(taskId), "Fichiers récupérés"));
    }

    @Operation(summary = "Supprimer un fichier")
    @DeleteMapping("/{id}")
    public ResponseEntity<Response<Void>> delete(@PathVariable Long id) {
        fileStorageService.delete(id);
        return ResponseEntity.ok(Response.ok(null, "Fichier supprimé"));
    }
}
