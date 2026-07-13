package com.nexawork.auth.controllers;

import com.nexawork.auth.dtos.responses.SearchHitResponse;
import com.nexawork.auth.entities.OrganisationMember;
import com.nexawork.auth.entities.User;
import com.nexawork.auth.repositories.OrganisationMemberRepository;
import com.nexawork.commons.models.Response;
import com.nexawork.commons.security.SecurityUtils;
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
import java.util.UUID;

/**
 * Recherche globale — volet Personnes (§4.8). Renvoie les membres actifs du
 * workspace courant dont le nom ou l'email correspond au terme.
 */
@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthSearchController {

    /** Nombre maximal de résultats par domaine (MVP sans moteur d'indexation). */
    static final int LIMIT = 10;

    OrganisationMemberRepository memberRepository;

    @GetMapping
    public Response<List<SearchHitResponse>> search(@RequestParam("q") String q) {
        List<SearchHitResponse> hits = new ArrayList<>();
        UUID orgId = SecurityUtils.getCurrentOrganisationId().orElse(null);
        if (q == null || q.isBlank() || orgId == null) {
            return Response.<List<SearchHitResponse>>ok().setPayload(hits);
        }

        for (OrganisationMember m : memberRepository.search(orgId, q.trim(), PageRequest.of(0, LIMIT))) {
            User u = m.getUser();
            hits.add(SearchHitResponse.builder()
                    .type("personnes")
                    .id(u.getId())
                    .name((u.getFirstName() + " " + u.getLastName()).trim())
                    .ctx(u.getJobTitle() != null && !u.getJobTitle().isBlank() ? u.getJobTitle() : u.getEmail())
                    .build());
        }

        return Response.<List<SearchHitResponse>>ok().setPayload(hits);
    }
}
