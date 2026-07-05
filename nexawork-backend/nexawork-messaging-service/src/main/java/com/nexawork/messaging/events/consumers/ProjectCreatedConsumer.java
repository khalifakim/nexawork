package com.nexawork.messaging.events.consumers;

import com.nexawork.messaging.entities.Channel;
import com.nexawork.messaging.entities.enums.ChannelIcon;
import com.nexawork.messaging.entities.enums.ChannelType;
import com.nexawork.messaging.repositories.ChannelRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consomme {@code project.created} (queue {@code nexawork.messaging.project-created},
 * V5.1 §7.3) : crée deux canaux par défaut dans le projet — « général » (standard)
 * et « annonces » (lecture seule, icône cloche). Les deux portent {@code isSystem=true}
 * (supprimables/renommables par admin ou chef de projet).
 *
 * <p>Idempotent : le consumer vérifie l'existence d'un canal système du même nom
 * avant création (rejeu RabbitMQ sans effet de bord).</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProjectCreatedConsumer {

    public static final String CHANNEL_GENERAL = "général";
    public static final String CHANNEL_ANNONCES = "annonces";

    ChannelRepository channelRepository;

    @RabbitListener(queues = "nexawork.messaging.project-created")
    @Transactional
    public void onProjectCreated(ProjectCreatedEvent event) {
        log.info("Réception project.created : projet {} ({})", event.projectId(), event.projectName());

        seedChannel(event, CHANNEL_GENERAL, ChannelIcon.HASH, false);
        seedChannel(event, CHANNEL_ANNONCES, ChannelIcon.BELL, true);
    }

    private void seedChannel(ProjectCreatedEvent event, String name, ChannelIcon icon, boolean readonly) {
        if (channelRepository.existsByProjectIdAndNameAndIsSystemTrue(event.projectId(), name)) {
            log.debug("Canal système « {} » déjà présent pour projet {} — ignoré (idempotent)",
                    name, event.projectId());
            return;
        }
        channelRepository.save(Channel.builder()
                .name(name)
                .icon(icon)
                .channelType(ChannelType.PROJECT)
                .organisationId(event.organisationId())
                .projectId(event.projectId())
                .createdByUserId(event.ownerUserId())
                .isSystem(true)
                .readonly(readonly)
                .isPrivate(false)
                .build());
        log.info("Canal « {} » (readonly={}) créé pour projet {}", name, readonly, event.projectId());
    }
}
