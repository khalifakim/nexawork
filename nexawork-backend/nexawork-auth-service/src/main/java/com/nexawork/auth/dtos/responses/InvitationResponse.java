package com.nexawork.auth.dtos.responses;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.nexawork.auth.entities.enums.InvitationStatus;
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
public class InvitationResponse {

    private UUID id;
    private String email;
    private OrgRole role;
    private InvitationStatus status;
    private LocalDateTime expiresAt;
    private String invitedByDisplayName;
    private LocalDateTime createdDate;
}
