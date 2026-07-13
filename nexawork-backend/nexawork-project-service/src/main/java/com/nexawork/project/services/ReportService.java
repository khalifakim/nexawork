package com.nexawork.project.services;

import java.util.UUID;

/**
 * Génération des rapports PDF (§17). Réutilise les mêmes agrégations que le
 * tableau de bord et la vue d'ensemble — aucune nouvelle donnée n'est calculée.
 */
public interface ReportService {

    /**
     * Rapport PDF d'un projet (§17.2). Droits : chef de projet ou ADMIN/OWNER.
     *
     * @param workspaceName nom de l'espace de travail à afficher en en-tête
     *                      (fourni par le frontend ; les workspaces sont gérés
     *                      par l'Auth Service, inconnus de ce service).
     */
    byte[] projectReport(UUID projectId, String workspaceName);

    /**
     * Rapport PDF global du workspace (§17.1). Droits : ADMIN/OWNER (R1).
     *
     * @param workspaceName nom de l'espace de travail à afficher en en-tête.
     */
    byte[] workspaceReport(UUID workspaceId, String workspaceName);
}
