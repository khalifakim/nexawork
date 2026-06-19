package com.nexawork.ged.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ged_access_grants")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GedAccessGrant {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "target_type", nullable = false, length = 10)
    private String targetType;   // "FOLDER" | "FILE"

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(name = "grantee_type", nullable = false, length = 10)
    private String granteeType;  // "USER" | "TEAM"

    @Column(name = "grantee_id", nullable = false)
    private Long granteeId;

    @Column(name = "access_level", nullable = false, length = 10)
    @Builder.Default
    private String accessLevel = "READER";  // "READER" | "EDITOR"

    @Column(nullable = false)
    private Long grantedBy;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
