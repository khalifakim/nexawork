package com.nexawork.messaging.services;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.messaging.entities.Channel;
import com.nexawork.messaging.entities.enums.ChannelType;
import com.nexawork.messaging.repositories.ChannelMemberRepository;
import com.nexawork.messaging.repositories.ChannelRepository;
import com.nexawork.messaging.security.CallerContext;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Contrôles d'accès aux canaux (V5.1 §12) : visibilité REF F (canaux privés →
 * 404 pour non-bénéficiaire), écriture REF D (readonly = ADMIN + chef de projet),
 * création R14 (canaux org = ADMIN+OWNER).
 *
 * <p><b>Best-effort (documenté)</b> : le Messaging ne connaît pas la composition
 * des projets. Le « chef de projet » (REF D projet) et l'assignation projet (R15)
 * ne sont pas vérifiables localement — pour un canal projet readonly, l'écriture
 * est autorisée aux administrateurs workspace ; le raffinement « chef de projet »
 * relève du Project Service.</p>
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChannelAccessGuard {

    ChannelRepository channelRepository;
    ChannelMemberRepository channelMemberRepository;
    CallerContext caller;

    /** Charge un canal borné au workspace de l'appelant (404 sinon). */
    public Channel loadInOrg(UUID channelId) {
        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new ResourceNotFoundException("Canal introuvable."));
        if (!channel.getOrganisationId().equals(caller.organisationId())) {
            throw new ResourceNotFoundException("Canal introuvable.");
        }
        return channel;
    }

    /** L'appelant a-t-il accès au canal ? (public de l'espace, ou membre si privé). */
    public boolean canView(Channel channel) {
        if (!channel.getOrganisationId().equals(caller.organisationId())) {
            return false;
        }
        if (Boolean.TRUE.equals(channel.getIsPrivate())) {
            // REF F : canal privé → seuls les ChannelMember + le créateur.
            return channel.getCreatedByUserId() != null && channel.getCreatedByUserId().equals(caller.userId())
                    || channelMemberRepository.existsByChannelIdAndUserId(channel.getId(), caller.userId());
        }
        return true; // public : tout membre de l'espace (canal org) ou du projet (R15, best-effort)
    }

    /** REF F : 404 si le canal n'est pas visible (ne pas révéler son existence). */
    public Channel requireViewable(UUID channelId) {
        Channel channel = loadInOrg(channelId);
        if (!canView(channel)) {
            throw new ResourceNotFoundException("Canal introuvable.");
        }
        return channel;
    }

    /** REF D : peut-on écrire dans ce canal ? (readonly → ADMIN+OWNER, best-effort chef de projet). */
    public boolean canWrite(Channel channel) {
        if (!canView(channel)) {
            return false;
        }
        if (Boolean.TRUE.equals(channel.getReadonly())) {
            return caller.isWorkspaceAdmin();
        }
        // Canal privé : écriture réservée aux membres EDITOR.
        if (Boolean.TRUE.equals(channel.getIsPrivate()) && !caller.isWorkspaceAdmin()) {
            return channelMemberRepository.findByChannelIdAndUserId(channel.getId(), caller.userId())
                    .map(m -> m.getAccessLevel() == com.nexawork.messaging.entities.enums.ChannelAccessLevel.EDITOR)
                    .orElse(channel.getCreatedByUserId() != null && channel.getCreatedByUserId().equals(caller.userId()));
        }
        return true;
    }

    public void requireWritable(Channel channel) {
        if (!canWrite(channel)) {
            throw new ForbiddenException(
                    "Écriture non autorisée dans ce canal (lecture seule ou accès restreint).");
        }
    }

    /** Administration d'un canal (rename, delete, access, PATCH) : ADMIN+OWNER (org) ; projet : best-effort ADMIN. */
    public void requireManage(Channel channel, String action) {
        if (!caller.isWorkspaceAdmin()) {
            throw new ForbiddenException("Action réservée aux administrateurs" +
                    (channel.getChannelType() == ChannelType.PROJECT ? " ou au chef de projet" : "") + " : " + action);
        }
    }

    /** R14 : création d'un canal organisation réservée ADMIN+OWNER. */
    public void requireCanCreate(boolean isOrgChannel, String action) {
        if (isOrgChannel && !caller.isWorkspaceAdmin()) {
            throw new ForbiddenException("Création d'un canal d'organisation réservée aux administrateurs : " + action);
        }
    }
}
