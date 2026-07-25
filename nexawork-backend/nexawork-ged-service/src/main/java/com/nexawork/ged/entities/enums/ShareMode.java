package com.nexawork.ged.entities.enums;

/**
 * Mode d'un lien de partage externe (Brique 4).
 *
 * <ul>
 *   <li>{@link #READ} — consultation + téléchargement (fichier, ou fichiers d'un dossier).</li>
 *   <li>{@link #DROP} — boîte de dépôt : un externe dépose des fichiers dans le dossier
 *       ciblé sans en voir le contenu existant (isolation). Réservé à une cible dossier.</li>
 *   <li>{@link #READ_WRITE} — lecture + dépôt : l'externe voit les fichiers existants du
 *       dossier ET peut y déposer (et voit alors les dépôts). Réservé à une cible dossier.</li>
 * </ul>
 */
public enum ShareMode {
    READ,
    DROP,
    READ_WRITE
}
