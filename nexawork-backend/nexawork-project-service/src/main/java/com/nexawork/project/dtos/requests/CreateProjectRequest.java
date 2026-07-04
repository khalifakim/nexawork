package com.nexawork.project.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

/**
 * Création d'un projet (V5.1 §6.1) : nom obligatoire, couleur et dates
 * optionnelles. Membres / chef / équipes sont ajoutés ensuite via les onglets.
 */
@Data
public class CreateProjectRequest {

    @NotBlank(message = "est obligatoire")
    private String name;

    private String color;

    private LocalDate startDate;

    private LocalDate endDate;
}
