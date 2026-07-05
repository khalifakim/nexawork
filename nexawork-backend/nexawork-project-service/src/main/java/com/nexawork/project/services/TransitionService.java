package com.nexawork.project.services;

import com.nexawork.project.dtos.requests.CreateTransitionRequest;
import com.nexawork.project.dtos.responses.TransitionResponse;

import java.util.List;
import java.util.UUID;

/**
 * Transitions de workflow d'un projet (§8.2.2). Gestion réservée
 * ADMIN+OWNER+chef de projet (R8) ; refusée si projet archivé (REF E).
 */
public interface TransitionService {

    List<TransitionResponse> listTransitions(UUID projectId);

    TransitionResponse createTransition(UUID projectId, CreateTransitionRequest request);
}
