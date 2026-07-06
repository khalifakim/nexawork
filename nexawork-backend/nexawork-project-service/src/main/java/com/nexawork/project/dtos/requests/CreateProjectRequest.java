package com.nexawork.project.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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

    /** Préfixe des task_key ; dérivé du nom si absent, rendu unique par workspace. */
    @Size(max = 10)
    @Pattern(regexp = "^[A-Za-z0-9]*$", message = "préfixe alphanumérique attendu")
    private String prefix;

    private String color;

    private LocalDate startDate;

    private LocalDate endDate;
}
