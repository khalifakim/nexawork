package com.nexawork.project.services;

import com.nexawork.project.dtos.requests.CreateTeamRequest;
import com.nexawork.project.dtos.responses.TeamResponse;

import java.util.List;
import java.util.UUID;

/**
 * Équipes internes d'un projet (§13.2, §10). Création réservée
 * ADMIN+OWNER+chef de projet (R9-R21) ; refusée si projet archivé (REF E).
 */
public interface TeamService {

    List<TeamResponse> listTeams(UUID projectId);

    TeamResponse createTeam(UUID projectId, CreateTeamRequest request);
}
