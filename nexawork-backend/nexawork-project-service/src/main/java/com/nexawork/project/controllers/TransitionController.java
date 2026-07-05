package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.requests.CreateTransitionRequest;
import com.nexawork.project.dtos.responses.TransitionResponse;
import com.nexawork.project.services.TransitionService;
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
 * Transitions de workflow d'un projet (§13.2, §8.2.2). Gestion réservée
 * ADMIN+OWNER+chef de projet (R8) ; refus 409 si projet archivé (REF E).
 */
@RestController
@RequestMapping("/api/v1/projects/{projectId}/transitions")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TransitionController {

    TransitionService transitionService;

    @GetMapping
    public Response<List<TransitionResponse>> list(@PathVariable UUID projectId) {
        return Response.<List<TransitionResponse>>ok().setPayload(transitionService.listTransitions(projectId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<TransitionResponse> create(@PathVariable UUID projectId,
                                               @Valid @RequestBody CreateTransitionRequest request) {
        return Response.<TransitionResponse>created()
                .setPayload(transitionService.createTransition(projectId, request));
    }
}
