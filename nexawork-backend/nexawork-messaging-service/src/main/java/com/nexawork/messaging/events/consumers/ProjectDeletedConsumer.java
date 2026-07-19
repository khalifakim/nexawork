package com.nexawork.messaging.events.consumers;

import com.nexawork.messaging.repositories.ChannelRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consomme {@code project.deleted} (queue {@code nexawork.messaging.project-deleted}) :
 * supprime tous les canaux du projet disparu.
 *
 * <p>Sans lui, les canaux d'un projet supprimé — dont les {@code #général}/{@code #annonces}
 * créés automatiquement — restaient orphelins dans la base du Messaging à jamais
 * (le Project Service ne peut pas cascader vers une autre base). Idempotent : si les
 * canaux ont déjà été supprimés (rejeu), la suppression ne retire simplement rien.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProjectDeletedConsumer {

    ChannelRepository channelRepository;

    @RabbitListener(queues = "nexawork.messaging.project-deleted")
    @Transactional
    public void onProjectDeleted(ProjectDeletedEvent event) {
        long removed = channelRepository.deleteByProjectId(event.projectId());
        log.info("Réception project.deleted : projet {} — {} canal/canaux supprimé(s).",
                event.projectId(), removed);
    }
}
