package com.nexawork.auth.dtos.responses;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.nexawork.auth.entities.enums.OrgRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MemberResponse {

    private UUID id;
    private UUID userId;
    private String email;
    private String firstName;
    private String lastName;
    private String displayName;
    private String jobTitle;
    private String photoUrl;
    private OrgRole orgRole;
    private LocalDateTime joinedAt;
    private Boolean isOwner;
    private Boolean isDeactivated;
}
