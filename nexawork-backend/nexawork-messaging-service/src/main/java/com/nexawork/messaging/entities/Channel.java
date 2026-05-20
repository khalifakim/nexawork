package com.nexawork.messaging.entities;

import com.nexawork.messaging.entities.enums.ChannelType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "channels")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Channel {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChannelType channelType = ChannelType.PUBLIC;

    @Column(nullable = false)
    private Long organisationId;

    private Long projectId;
    private Long createdByUserId;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "channel", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ChannelMember> members = new ArrayList<>();
}
