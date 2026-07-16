package com.nexawork.project.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.project.dtos.responses.ReceivedCommentMentionResponse;
import com.nexawork.project.services.TaskCommentService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Mentions reçues dans des commentaires (§5.3) — alimente l'onglet « Commentaires »
 * de « Mentions reçues ». Scopé à l'utilisateur courant.
 */
@RestController
@RequestMapping("/api/v1/comment-mentions")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CommentMentionController {

    TaskCommentService commentService;

    @GetMapping
    public Response<List<ReceivedCommentMentionResponse>> received() {
        return Response.<List<ReceivedCommentMentionResponse>>ok()
                .setPayload(commentService.listReceivedMentions());
    }
}
