package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.responses.SearchHitResponse;
import com.nexawork.project.entities.Project;
import com.nexawork.project.entities.Task;
import com.nexawork.project.entities.enums.ProjectStatus;
import com.nexawork.project.repositories.ProjectRepository;
import com.nexawork.project.repositories.TaskRepository;
import com.nexawork.project.security.CallerContext;
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
 * Recherche globale — volet Projets (§4.8). Renvoie les projets et les tâches
 * du workspace correspondant au terme, en respectant la visibilité de
 * l'appelant (R15 : administrateur, ou membre du projet).
 */
@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SearchController {

    /** Nombre maximal de résultats par domaine (MVP sans moteur d'indexation). */
    static final int LIMIT = 10;

    ProjectRepository projectRepository;
    TaskRepository taskRepository;
    CallerContext caller;

    @GetMapping
    public Response<List<SearchHitResponse>> search(@RequestParam("q") String q) {
        List<SearchHitResponse> hits = new ArrayList<>();
        if (q == null || q.isBlank()) {
            return Response.<List<SearchHitResponse>>ok().setPayload(hits);
        }

        String term = q.trim();
        var page = PageRequest.of(0, LIMIT);
        boolean isAdmin = caller.isWorkspaceAdmin();

        for (Project p : projectRepository.search(
                caller.organisationId(), term, ProjectStatus.ACTIVE, caller.userId(), isAdmin, page)) {
            hits.add(SearchHitResponse.builder()
                    .type("projets")
                    .id(p.getId())
                    .name(p.getName())
                    .ctx("Projet")
                    .color(p.getColor())
                    .build());
        }

        for (Task t : taskRepository.search(
                caller.organisationId(), term, ProjectStatus.ACTIVE, caller.userId(), isAdmin, page)) {
            hits.add(SearchHitResponse.builder()
                    .type("taches")
                    .id(t.getId())
                    .name(t.getTitle())
                    .ctx(t.getProject().getName())
                    .mono(t.getTaskKey())
                    .color(t.getStatus() != null ? t.getStatus().getColor() : null)
                    .build());
        }

        return Response.<List<SearchHitResponse>>ok().setPayload(hits);
    }
}
