package com.nexawork.ged.entities;

import com.nexawork.ged.entities.enums.PermissionLevel;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "folder_permissions",
    uniqueConstraints = @UniqueConstraint(columnNames = {"folder_id", "user_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FolderPermission {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id", nullable = false)
    private GedFolder folder;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PermissionLevel level;
}
