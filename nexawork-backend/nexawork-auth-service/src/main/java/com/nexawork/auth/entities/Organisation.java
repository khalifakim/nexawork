package com.nexawork.auth.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "organisations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Organisation extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String slug;

    private String logoUrl;
}
