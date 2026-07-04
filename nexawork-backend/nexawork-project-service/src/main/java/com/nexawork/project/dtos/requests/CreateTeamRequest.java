package com.nexawork.project.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Création d'une équipe interne au projet (§13.2, §10).
 */
@Data
public class CreateTeamRequest {

    @NotBlank(message = "est obligatoire")
    private String name;

    private String color;
}
