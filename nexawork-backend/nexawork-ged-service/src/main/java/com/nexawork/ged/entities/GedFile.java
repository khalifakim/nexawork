package com.nexawork.ged.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ged_files")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GedFile {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id", nullable = false)
    private GedFolder folder;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String fileUrl;

    private Long fileSize;
    private String contentType;

    private Long sourceFileId;
    private Long taskId;
    private Long projectId;

    @Column(nullable = false)
    private Long addedByUserId;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime addedAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    private LocalDateTime lastOpenedAt;
    private Long lastOpenedBy;
}
