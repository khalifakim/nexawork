package com.nexawork.ged.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.ged.dtos.responses.FileResponse;
import com.nexawork.ged.services.GedFileService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Vues transverses de la GED (§13.4, §11.1) : « Mes documents », corbeille
 * (R11 : filtrée par utilisateur), vidage de corbeille. « Partagé avec moi »
 * (basé sur les grants) est ajouté au Lot 6C.
 */
@RestController
@RequestMapping("/api/v1/ged")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GedLibraryController {

    GedFileService fileService;

    @GetMapping("/my-documents")
    public Response<List<FileResponse>> myDocuments() {
        return Response.<List<FileResponse>>ok().setPayload(fileService.myDocuments());
    }

    @GetMapping("/trash")
    public Response<List<FileResponse>> trash() {
        return Response.<List<FileResponse>>ok().setPayload(fileService.trash());
    }

    @DeleteMapping("/trash")
    public Response<Void> emptyTrash() {
        fileService.emptyTrash();
        return Response.deleted();
    }
}
