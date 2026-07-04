package com.nexawork.auth.dtos.responses;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.nexawork.auth.entities.enums.OrgRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WorkspaceResponse {

    private UUID id;
    private String name;
    private String slug;
    private String color;
    private String iconUrl;
    private Long memberCount;

    /**
     * Rôle de l'appelant dans ce workspace (contextuel à GET /workspaces).
     */
    private OrgRole myRole;

    private Boolean isOwner;
}
