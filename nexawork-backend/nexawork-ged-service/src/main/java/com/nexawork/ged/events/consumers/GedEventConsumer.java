package com.nexawork.ged.events.consumers;

import com.nexawork.ged.configurations.RabbitMQConfig;
import com.nexawork.ged.entities.GedFile;
import com.nexawork.ged.entities.GedFolder;
import com.nexawork.ged.repositories.GedFileRepository;
import com.nexawork.ged.repositories.GedFolderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class GedEventConsumer {

    private final GedFolderRepository folderRepo;
    private final GedFileRepository fileRepo;

    @RabbitListener(queues = RabbitMQConfig.Q_PROJECT_CREATED)
    public void onProjectCreated(Map<String, Object> event) {
        try {
            Long projectId     = toLong(event.get("projectId"));
            Long orgId         = toLong(event.get("organisationId"));
            Long ownerUserId   = toLong(event.get("ownerUserId"));
            String projectName = (String) event.get("projectName");

            GedFolder root = GedFolder.builder()
                .name(projectName)
                .organisationId(orgId)
                .projectId(projectId)
                .createdByUserId(ownerUserId)
                .build();
            folderRepo.save(root);
            log.info("Dossier GED créé pour le projet {} ({})", projectName, projectId);
        } catch (Exception e) {
            log.error("Erreur traitement project.created : {}", e.getMessage());
        }
    }

    @RabbitListener(queues = RabbitMQConfig.Q_FILE_ATTACHED)
    public void onFileAttachedToTask(Map<String, Object> event) {
        try {
            Long taskId     = toLong(event.get("taskId"));
            Long projectId  = toLong(event.get("projectId"));
            String fileName = (String) event.get("fileName");
            String fileUrl  = (String) event.get("fileUrl");
            Long userId     = toLong(event.get("uploadedByUserId"));

            folderRepo.findByProjectId(projectId).stream().findFirst().ifPresent(folder -> {
                GedFile gedFile = GedFile.builder()
                    .folder(folder)
                    .name(fileName)
                    .fileUrl(fileUrl)
                    .taskId(taskId)
                    .projectId(projectId)
                    .addedByUserId(userId)
                    .build();
                fileRepo.save(gedFile);
                log.info("Fichier GED indexé depuis tâche {} : {}", taskId, fileName);
            });
        } catch (Exception e) {
            log.error("Erreur traitement file.attached.to.task : {}", e.getMessage());
        }
    }

    private Long toLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.longValue();
        return Long.parseLong(value.toString());
    }
}
