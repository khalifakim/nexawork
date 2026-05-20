package com.nexawork.file.services;

import com.nexawork.file.configurations.MinioConfig;
import com.nexawork.file.dtos.responses.FileResponse;
import com.nexawork.file.entities.StoredFile;
import com.nexawork.file.exceptions.ResourceNotFoundException;
import com.nexawork.file.repositories.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final StoredFileRepository fileRepo;
    private final MinioService minioService;
    private final MinioConfig minioConfig;
    private final RabbitTemplate rabbitTemplate;

    @Transactional
    public FileResponse upload(MultipartFile file, Long uploadedByUserId,
                               Long organisationId, Long projectId, Long taskId) {
        String bucket = projectId != null
            ? minioConfig.getProjectsBucket()
            : minioConfig.getChatBucket();

        String objectKey = minioService.upload(file, bucket);

        StoredFile stored = StoredFile.builder()
            .originalName(file.getOriginalFilename())
            .storedName(objectKey)
            .bucket(bucket)
            .objectKey(objectKey)
            .contentType(file.getContentType())
            .size(file.getSize())
            .uploadedByUserId(uploadedByUserId)
            .organisationId(organisationId)
            .projectId(projectId)
            .taskId(taskId)
            .build();
        fileRepo.save(stored);

        if (taskId != null) {
            rabbitTemplate.convertAndSend("nexawork.events", "file.attached.to.task",
                new java.util.HashMap<String, Object>() {{
                    put("taskId", taskId);
                    put("projectId", projectId);
                    put("fileName", file.getOriginalFilename());
                    put("fileUrl", objectKey);
                    put("uploadedByUserId", uploadedByUserId);
                }});
        }

        return toResponse(stored);
    }

    @Transactional(readOnly = true)
    public String getDownloadUrl(Long fileId) {
        StoredFile f = getOrThrow(fileId);
        return minioService.generatePresignedUrl(f.getBucket(), f.getObjectKey(), 60);
    }

    @Transactional(readOnly = true)
    public List<FileResponse> findByProject(Long projectId) {
        return fileRepo.findByProjectId(projectId).stream()
            .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FileResponse> findByTask(Long taskId) {
        return fileRepo.findByTaskId(taskId).stream()
            .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public void delete(Long fileId) {
        StoredFile f = getOrThrow(fileId);
        minioService.delete(f.getBucket(), f.getObjectKey());
        fileRepo.delete(f);
    }

    private StoredFile getOrThrow(Long id) {
        return fileRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Fichier introuvable : " + id));
    }

    private FileResponse toResponse(StoredFile f) {
        String downloadUrl = minioService.generatePresignedUrl(f.getBucket(), f.getObjectKey(), 60);
        return new FileResponse(f.getId(), f.getOriginalName(), f.getContentType(),
            f.getSize(), downloadUrl, f.getUploadedByUserId(),
            f.getProjectId(), f.getTaskId(), f.getUploadedAt());
    }
}
