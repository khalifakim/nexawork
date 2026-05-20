package com.nexawork.file.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "stored_files")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StoredFile {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String originalName;

    @Column(nullable = false)
    private String storedName;

    @Column(nullable = false)
    private String bucket;

    @Column(nullable = false)
    private String objectKey;

    @Column(nullable = false)
    private String contentType;

    private Long size;

    @Column(nullable = false)
    private Long uploadedByUserId;

    private Long organisationId;
    private Long projectId;
    private Long taskId;

    @Column(nullable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();
}
