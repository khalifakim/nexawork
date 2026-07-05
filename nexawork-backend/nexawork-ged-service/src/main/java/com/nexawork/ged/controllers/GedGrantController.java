package com.nexawork.ged.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.ged.dtos.requests.CreateGrantRequest;
import com.nexawork.ged.dtos.responses.GrantResponse;
import com.nexawork.ged.services.GedAccessService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Grants Lecteur/Éditeur (§13.4, §11.6). R13 (ligne propriétaire verrouillée),
 * rejet dossier système (403). Lister : {@code ?targetType=FILE&targetId=…}.
 */
@RestController
@RequestMapping("/api/v1/ged/grants")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GedGrantController {

    GedAccessService accessService;

    @GetMapping
    public Response<List<GrantResponse>> list(@RequestParam String targetType, @RequestParam UUID targetId) {
        return Response.<List<GrantResponse>>ok().setPayload(accessService.listGrants(targetType, targetId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<GrantResponse> add(@Valid @RequestBody CreateGrantRequest request) {
        return Response.<GrantResponse>created().setPayload(accessService.addGrant(request));
    }

    @DeleteMapping("/{grantId}")
    public Response<Void> revoke(@PathVariable UUID grantId) {
        accessService.revokeGrant(grantId);
        return Response.deleted();
    }
}
