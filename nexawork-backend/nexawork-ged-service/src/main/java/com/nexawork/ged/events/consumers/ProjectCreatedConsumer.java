package com.nexawork.ged.events.consumers;

import com.nexawork.ged.entities.GedFolder;
import com.nexawork.ged.entities.enums.AccessMode;
import com.nexawork.ged.entities.enums.FolderType;
import com.nexawork.ged.repositories.GedFolderRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consomme {@code project.created} (queue {@code nexawork.ged.project-created},
 * V5.1 §7.3) : crée le <b>seul</b> dossier système attendu à la création d'un
 * projet — « Pièces jointes aux tâches » ({@code folderType=TASK_ATTACHMENTS}).
 *
 * <p>Aucun dossier « utilisateur » n'est créé automatiquement : l'espace du projet
 * démarre vide, l'utilisateur y crée ses dossiers et/ou dépose des fichiers à la
 * racine (V2). (Auparavant un dossier au nom du projet était seedé — retiré.)</p>
 *
 * <p>Idempotent : l'index unique partiel {@code (project_id, folder_type) WHERE
 * parent_id IS NULL} empêche toute duplication si l'événement est rejoué ; le
 * consumer vérifie d'abord l'existence pour éviter une exception inutile.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProjectCreatedConsumer {

    GedFolderRepository folderRepository;

    @RabbitListener(queues = "nexawork.ged.project-created")
    @Transactional
    public void onProjectCreated(ProjectCreatedEvent event) {
        log.info("Réception project.created : projet {} ({})", event.projectId(), event.projectName());

        // Seul le dossier système « Pièces jointes aux tâches » est créé d'office.
        seedRootFolder(event, FolderType.TASK_ATTACHMENTS, "Pièces jointes aux tâches");
    }

    private void seedRootFolder(ProjectCreatedEvent event, FolderType type, String name) {
        if (folderRepository.existsByProjectIdAndFolderTypeAndParentIdIsNull(event.projectId(), type)) {
            log.debug("Dossier racine {} déjà présent pour projet {} — ignoré (idempotent)",
                    type, event.projectId());
            return;
        }
        folderRepository.save(GedFolder.builder()
                .name(name)
                .parentId(null)
                .organisationId(event.organisationId())
                .projectId(event.projectId())
                .folderType(type)
                .accessMode(AccessMode.OPEN)
                .createdByUserId(event.ownerUserId())
                .isDeleted(false)
                .build());
        log.info("Dossier racine {} « {} » créé pour projet {}", type, name, event.projectId());
    }
}
