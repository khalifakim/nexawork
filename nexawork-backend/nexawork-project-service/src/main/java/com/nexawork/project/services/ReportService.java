package com.nexawork.project.services;

import java.util.UUID;

/**
 * Génération des rapports PDF (§17). Réutilise les mêmes agrégations que le
 * tableau de bord et la vue d'ensemble — aucune nouvelle donnée n'est calculée.
 */
public interface ReportService {

    /** Rapport PDF d'un projet (§17.2). Droits : chef de projet ou ADMIN/OWNER. */
    byte[] projectReport(UUID projectId);

    /** Rapport PDF global du workspace (§17.1). Droits : ADMIN/OWNER (R1). */
    byte[] workspaceReport(UUID workspaceId);
}
