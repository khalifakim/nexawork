package com.nexawork.auth.entities;

import com.nexawork.auth.entities.enums.OrgRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "organisation_members",
    uniqueConstraints = @UniqueConstraint(columnNames = {"organisation_id", "user_id"})
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganisationMember extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organisation_id", nullable = false)
    private Organisation organisation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrgRole orgRole;

    private LocalDateTime joinedAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isOwner = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isDeactivated = false;
}
