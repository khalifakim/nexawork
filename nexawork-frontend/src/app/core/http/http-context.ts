import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Marque une requête dont l'erreur est **gérée localement** par l'appelant
 * (message inline, revert, etc.) : l'intercepteur d'erreurs n'affiche alors PAS
 * de toast. Par défaut `false` → comportement normal (toast centralisé).
 */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/**
 * Contexte prêt à l'emploi pour les requêtes **de fond** (sondages : appels
 * actifs, présence, fichiers d'une réunion…). Une requête que l'utilisateur n'a
 * pas déclenchée ne doit jamais lui afficher « le serveur ne répond pas » : son
 * échec est rattrapé en silence (l'appelant retombe sur une valeur par défaut).
 *
 * `() => new HttpContext()...` : un `HttpContext` est **mutable**, on en crée un
 * neuf à chaque appel pour ne pas partager d'état entre requêtes.
 */
export const SILENT = (): HttpContext => new HttpContext().set(SKIP_ERROR_TOAST, true);
