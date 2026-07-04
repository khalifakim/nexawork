package com.nexawork.auth.dtos.requests;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * PATCH /users/me/profile (§13.1) — payload atomique : aucun champ manquant
 * n'est effacé (les champs nuls sont ignorés).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {

    @Size(max = 120)
    private String firstName;

    @Size(max = 120)
    private String lastName;

    @Size(max = 255)
    private String jobTitle;

    @Size(max = 1024)
    private String photoUrl;
}
