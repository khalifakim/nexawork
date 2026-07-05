package com.nexawork.messaging.controllers;

import com.nexawork.commons.models.Response;
import com.nexawork.messaging.dtos.requests.ChannelAccessRequest;
import com.nexawork.messaging.dtos.requests.CreateChannelRequest;
import com.nexawork.messaging.dtos.requests.UpdateChannelRequest;
import com.nexawork.messaging.dtos.responses.ChannelMemberResponse;
import com.nexawork.messaging.dtos.responses.ChannelResponse;
import com.nexawork.messaging.services.ChannelService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Canaux (§13.5). REF F (privés absents/404), REF D (écriture readonly),
 * R14 (création org = ADMIN+OWNER). Administration = ADMIN (org) / chef de projet.
 */
@RestController
@RequestMapping("/api/v1/channels")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChannelController {

    ChannelService channelService;

    /** {@code ?projectId=} pour les canaux d'un projet, absent pour les canaux d'organisation. */
    @GetMapping
    public Response<List<ChannelResponse>> list(@RequestParam(required = false) UUID projectId) {
        return Response.<List<ChannelResponse>>ok().setPayload(channelService.listChannels(projectId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response<ChannelResponse> create(@Valid @RequestBody CreateChannelRequest request) {
        return Response.<ChannelResponse>created().setPayload(channelService.createChannel(request));
    }

    @GetMapping("/{id}")
    public Response<ChannelResponse> get(@PathVariable UUID id) {
        return Response.<ChannelResponse>ok().setPayload(channelService.getChannel(id));
    }

    @PatchMapping("/{id}")
    public Response<ChannelResponse> update(@PathVariable UUID id,
                                            @Valid @RequestBody UpdateChannelRequest request) {
        return Response.<ChannelResponse>ok().setPayload(channelService.updateChannel(id, request));
    }

    @DeleteMapping("/{id}")
    public Response<Void> delete(@PathVariable UUID id) {
        channelService.deleteChannel(id);
        return Response.deleted();
    }

    @GetMapping("/{id}/access")
    public Response<List<ChannelMemberResponse>> getAccess(@PathVariable UUID id) {
        return Response.<List<ChannelMemberResponse>>ok().setPayload(channelService.getAccess(id));
    }

    @PutMapping("/{id}/access")
    public Response<List<ChannelMemberResponse>> updateAccess(@PathVariable UUID id,
                                                              @Valid @RequestBody ChannelAccessRequest request) {
        return Response.<List<ChannelMemberResponse>>ok().setPayload(channelService.updateAccess(id, request));
    }
}
