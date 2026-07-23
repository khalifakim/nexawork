package com.nexawork.ged.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.ged.dtos.responses.SearchHitResponse;
import com.nexawork.ged.entities.GedFile;
import com.nexawork.ged.entities.GedFolder;
import com.nexawork.ged.entities.enums.FolderType;
import com.nexawork.ged.repositories.GedFileRepository;
import com.nexawork.ged.repositories.GedFolderRepository;
import com.nexawork.ged.security.CallerContext;
import com.nexawork.ged.services.AccessEvaluator;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

/**
 * Recherche globale — volet Documents (§4.8). Renvoie les dossiers et fichiers
 * du workspace correspondant au terme, filtrés par la visibilité de l'appelant
 * (REF G) : un élément restreint n'apparaît jamais pour un non-bénéficiaire.
 */
@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GedSearchController {

    /** Nombre maximal de résultats par domaine (MVP sans moteur d'indexation). */
    static final int LIMIT = 10;

    GedFolderRepository folderRepository;
    GedFileRepository fileRepository;
    AccessEvaluator access;
    CallerContext caller;

    @GetMapping
    public Response<List<SearchHitResponse>> search(@RequestParam("q") String q) {
        List<SearchHitResponse> hits = new ArrayList<>();
        // Terme vide (champ non encore saisi) : top N de chaque domaine (LIKE '%%'
        // matche tout) pour peupler la vue dès l'ouverture (§4.8).
        String term = q == null ? "" : q.trim();
        var page = PageRequest.of(0, LIMIT);

        for (GedFolder d : folderRepository.search(caller.organisationId(), term, page)) {
            // REF G — un dossier non visible n'est jamais divulgué.
            if (!access.canView(d) || d.getFolderType() == FolderType.TASK_ATTACHMENTS) {
                continue;
            }
            hits.add(SearchHitResponse.builder()
                    .type("documents")
                    .id(d.getId())
                    .name(d.getName())
                    .ctx("Dossier")
                    .build());
        }

        for (GedFile f : fileRepository.search(caller.organisationId(), term, page)) {
            // REF G — un document restreint n'apparaît pas pour un non-bénéficiaire.
            if (!access.canView(f)) {
                continue;
            }
            hits.add(SearchHitResponse.builder()
                    .type("documents")
                    .id(f.getId())
                    .name(f.getName())
                    .ctx(f.getFolder() != null ? f.getFolder().getName() : "Documents")
                    .build());
        }

        return Response.<List<SearchHitResponse>>ok().setPayload(hits);
    }
}
