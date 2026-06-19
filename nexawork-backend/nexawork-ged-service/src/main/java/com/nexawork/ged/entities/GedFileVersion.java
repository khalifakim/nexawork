package com.nexawork.ged.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ged_file_versions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GedFileVersion {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ged_file_id", nullable = false)
    private GedFile gedFile;

    @Column(nullable = false)
    private Integer versionNumber;

    @Column(nullable = false)
    private Long sourceFileId;

    @Column(nullable = false)
    private String fileUrl;

    private Long fileSize;

    @Column(nullable = false)
    private Long uploadedBy;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
