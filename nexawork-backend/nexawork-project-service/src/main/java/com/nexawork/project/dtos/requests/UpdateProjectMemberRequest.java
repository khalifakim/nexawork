package com.nexawork.project.dtos.requests;

import com.nexawork.project.entities.enums.ProjectRole;
import lombok.Data;

import java.util.UUID;

/**
 * Mise à jour d'un membre projet (§13.2) : changer le rôle, l'équipe, le statut
 * de chef d'équipe. {@code setAsProjectChief=true} désigne ce membre comme
 * « Chef de projet » fonctionnel → met à jour {@code Project.ownerUserId}
 * (V5.1 §4.2). Champs nuls = inchangés.
 */
@Data
public class UpdateProjectMemberRequest {

    private ProjectRole projectRole;

    private UUID teamId;

    /** Retire le membre de son équipe si vrai (car teamId=null est ambigu). */
    private Boolean clearTeam;

    private Boolean isProjectLead;

    /** Désigne ce membre comme chef de projet (Project.ownerUserId). */
    private Boolean setAsProjectChief;
}
