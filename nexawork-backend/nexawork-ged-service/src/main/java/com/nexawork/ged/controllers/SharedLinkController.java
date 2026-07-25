package com.nexawork.ged.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.ged.dtos.requests.CreateShareLinkRequest;
import com.nexawork.ged.dtos.responses.ShareLinkResponse;
import com.nexawork.ged.services.SharedLinkService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
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
 * Gestion AUTHENTIFIÉE des liens de partage externes (Brique 4) : le propriétaire
 * crée, liste et révoque ses liens. Les endpoints publics (consultation par token)
 * sont dans {@link PublicShareController}.
 */
@RestController
@RequestMapping("/api/v1/ged/shares")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SharedLinkController {

    SharedLinkService sharedLinkService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<ShareLinkResponse> create(@Valid @RequestBody CreateShareLinkRequest request) {
        return Response.<ShareLinkResponse>created().setPayload(sharedLinkService.create(request));
    }

    @GetMapping
    public Response<List<ShareLinkResponse>> myLinks() {
        return Response.<List<ShareLinkResponse>>ok().setPayload(sharedLinkService.myLinks());
    }

    @DeleteMapping("/{id}")
    public Response<Void> revoke(@PathVariable UUID id) {
        sharedLinkService.revoke(id);
        return Response.ok();
    }
}
