import { HttpContextToken } from '@angular/common/http';

/**
 * Marque une requête dont l'erreur est **gérée localement** par l'appelant
 * (message inline, revert, etc.) : l'intercepteur d'erreurs n'affiche alors PAS
 * de toast. Par défaut `false` → comportement normal (toast centralisé).
 */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
