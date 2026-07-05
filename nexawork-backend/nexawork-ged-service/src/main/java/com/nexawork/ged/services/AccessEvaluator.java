package com.nexawork.ged.services;

import com.nexawork.commons.exceptions.ForbiddenException;
import com.nexawork.commons.exceptions.ResourceNotFoundException;
import com.nexawork.ged.entities.GedFile;
import com.nexawork.ged.entities.GedFolder;
import com.nexawork.ged.entities.enums.AccessLevel;
import com.nexawork.ged.entities.enums.AccessMode;
import com.nexawork.ged.entities.enums.GranteeType;
import com.nexawork.ged.entities.enums.TargetType;
import com.nexawork.ged.repositories.GedAccessGrantRepository;
import com.nexawork.ged.security.CallerContext;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Évaluation de la visibilité et des droits REF G (V5.1 §11 : REF G, R12, R13).
 *
 * <p>Un accès interdit se traduit par <b>404</b> (et non 403) pour ne pas révéler
 * l'existence d'un document restreint (§11 REF G, backend). L'exception : la
 * suppression, refusée par <b>403</b> (R12), puisque la ressource est visible mais
 * l'action non autorisée.</p>
 *
 * <p><b>Portée du contrôle (best-effort local, cf. décision R16)</b> : le GED ne
 * connaît ni la composition des projets ni celle des équipes. Pour {@code OPEN}, il
 * vérifie l'appartenance au workspace (X-Org-Id) ; la restriction stricte aux
 * membres d'un projet (GED projet) relève du Project Service. Pour {@code SHARED},
 * seuls les grants de type USER sont évalués ici ; les grants TEAM seront affinés
 * au Lot 6C.</p>
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class AccessEvaluator {

    GedAccessGrantRepository grantRepository;
    CallerContext caller;

    // ─── Dossiers ─────────────────────────────────────────────────────────────

    public boolean canView(GedFolder folder) {
        return hasAccess(folder.getOrganisationId(), folder.getCreatedByUserId(),
                folder.getAccessMode(), TargetType.FOLDER, folder.getId());
    }

    /** 404 si le dossier n'est pas visible par l'appelant (REF G). */
    public GedFolder requireViewable(GedFolder folder) {
        if (!canView(folder)) {
            throw new ResourceNotFoundException("Dossier introuvable.");
        }
        return folder;
    }

    // ─── Fichiers ─────────────────────────────────────────────────────────────

    public boolean canView(GedFile file) {
        return hasAccess(file.getFolder().getOrganisationId(), file.getAddedByUserId(),
                file.getAccessMode(), TargetType.FILE, file.getId());
    }

    public GedFile requireViewable(GedFile file) {
        if (!canView(file)) {
            throw new ResourceNotFoundException("Fichier introuvable.");
        }
        return file;
    }

    // ─── Suppression (R12 : créateur ou ADMIN/OWNER) ─────────────────────────────

    public void requireDeletable(UUID creatorUserId) {
        if (!creatorUserId.equals(caller.userId()) && !caller.isWorkspaceAdmin()) {
            throw new ForbiddenException(
                    "Suppression réservée au créateur ou à un administrateur du workspace.");
        }
    }

    // ─── Édition (R13 : propriétaire, ADMIN/OWNER, ou grant EDITOR) ──────────────

    public boolean canEdit(UUID creatorUserId, TargetType targetType, UUID targetId) {
        if (creatorUserId.equals(caller.userId()) || caller.isWorkspaceAdmin()) {
            return true;
        }
        return grantRepository.findByTargetTypeAndTargetId(targetType, targetId).stream()
                .anyMatch(g -> g.getGranteeType() == GranteeType.USER
                        && g.getGranteeId().equals(caller.userId())
                        && g.getAccessLevel() == AccessLevel.EDITOR);
    }

    public void requireEditable(UUID creatorUserId, TargetType targetType, UUID targetId, String action) {
        if (!canEdit(creatorUserId, targetType, targetId)) {
            throw new ForbiddenException("Action réservée au propriétaire, à un éditeur ou à un administrateur : " + action);
        }
    }

    // ─── Cœur de la règle REF G ─────────────────────────────────────────────────

    private boolean hasAccess(UUID organisationId, UUID creatorUserId, AccessMode mode,
                              TargetType targetType, UUID targetId) {
        UUID me = caller.userId();
        // Le créateur voit toujours ses propres éléments, quel que soit le mode.
        if (creatorUserId.equals(me)) {
            return true;
        }
        // L'ADMIN/OWNER ne contourne PAS PRIVATE/SHARED (REF G, §sécurité) : il
        // n'accède qu'aux éléments OPEN, via son appartenance au workspace.
        return switch (mode) {
            case OPEN -> organisationId.equals(caller.organisationId());
            case PRIVATE -> false;
            case SHARED -> isUserGrantee(targetType, targetId, me);
        };
    }

    private boolean isUserGrantee(TargetType targetType, UUID targetId, UUID me) {
        List<UUID> grantees = grantRepository.findByTargetTypeAndTargetId(targetType, targetId).stream()
                .filter(g -> g.getGranteeType() == GranteeType.USER)
                .map(g -> g.getGranteeId())
                .toList();
        return grantees.contains(me);
    }
}
