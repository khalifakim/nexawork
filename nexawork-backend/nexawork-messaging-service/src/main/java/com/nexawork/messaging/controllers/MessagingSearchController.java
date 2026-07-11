package com.nexawork.messaging.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.messaging.dtos.responses.SearchHitResponse;
import com.nexawork.messaging.entities.Channel;
import com.nexawork.messaging.entities.Message;
import com.nexawork.messaging.repositories.ChannelRepository;
import com.nexawork.messaging.repositories.MessageRepository;
import com.nexawork.messaging.security.CallerContext;
import com.nexawork.messaging.services.ChannelAccessGuard;
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
 * Recherche globale — volet Messagerie (§4.8). Renvoie les canaux et les
 * messages correspondant au terme, en respectant REF F : un canal privé (et ses
 * messages) n'apparaît jamais pour un utilisateur qui n'y a pas accès.
 */
@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MessagingSearchController {

    /** Nombre maximal de résultats par domaine (MVP sans moteur d'indexation). */
    static final int LIMIT = 10;
    /** Longueur de l'extrait de message affiché dans les résultats. */
    static final int SNIPPET = 90;

    ChannelRepository channelRepository;
    MessageRepository messageRepository;
    ChannelAccessGuard guard;
    CallerContext caller;

    @GetMapping
    public Response<List<SearchHitResponse>> search(@RequestParam("q") String q) {
        List<SearchHitResponse> hits = new ArrayList<>();
        if (q == null || q.isBlank()) {
            return Response.<List<SearchHitResponse>>ok().setPayload(hits);
        }

        String term = q.trim();
        var page = PageRequest.of(0, LIMIT);

        for (Channel c : channelRepository.search(caller.organisationId(), term, page)) {
            // REF F — un canal privé n'est pas divulgué à un non-membre.
            if (!guard.canView(c)) {
                continue;
            }
            hits.add(SearchHitResponse.builder()
                    .type("canaux")
                    .id(c.getId())
                    .name(c.getName())
                    .ctx(c.getProjectId() != null ? "Canal de projet" : "Canal d'organisation")
                    .build());
        }

        for (Message m : messageRepository.search(caller.organisationId(), caller.userId(), term, page)) {
            // REF F — un message d'un canal non visible ne doit pas fuiter.
            if (m.getChannel() != null && !guard.canView(m.getChannel())) {
                continue;
            }
            hits.add(SearchHitResponse.builder()
                    .type("messages")
                    .id(m.getId())
                    .name(snippet(m.getContent()))
                    .ctx(m.getChannel() != null ? "#" + m.getChannel().getName() : "Conversation")
                    .build());
        }

        return Response.<List<SearchHitResponse>>ok().setPayload(hits);
    }

    /** Extrait court du message, tronqué proprement. */
    private String snippet(String content) {
        if (content == null) {
            return "";
        }
        String flat = content.replaceAll("\\s+", " ").trim();
        return flat.length() <= SNIPPET ? flat : flat.substring(0, SNIPPET) + "…";
    }
}
