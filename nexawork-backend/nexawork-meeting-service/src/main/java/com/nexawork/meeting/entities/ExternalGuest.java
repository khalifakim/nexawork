package com.nexawork.meeting.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "external_guests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExternalGuest {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "call_id", nullable = false)
    private Call call;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String displayName;

    @Column(nullable = false, unique = true)
    private String guestToken;

    private Boolean used = false;
}
