package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.requests.CreateTeamRequest;
import com.nexawork.project.dtos.responses.TeamResponse;
import com.nexawork.project.services.TeamService;
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
 * Équipes d'un projet (§13.2, §10). Création réservée ADMIN+OWNER+chef de projet
 * (R9-R21) ; refus 409 si le projet est archivé (REF E).
 */
@RestController
@RequestMapping("/api/v1/projects/{projectId}/teams")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TeamController {

    TeamService teamService;

    @GetMapping
    public Response<List<TeamResponse>> list(@PathVariable UUID projectId) {
        return Response.<List<TeamResponse>>ok().setPayload(teamService.listTeams(projectId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<TeamResponse> create(@PathVariable UUID projectId,
                                         @Valid @RequestBody CreateTeamRequest request) {
        return Response.<TeamResponse>created().setPayload(teamService.createTeam(projectId, request));
    }
}
