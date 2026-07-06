/**
 * Décodage léger d'un JWT côté client — lecture des claims uniquement (pas de
 * vérification de signature, qui reste la responsabilité du backend). Utilisé au
 * démarrage pour restaurer le contexte (workspace actif) après un rechargement.
 */
export interface JwtClaims {
  sub?: string;
  userId?: string;
  displayName?: string;
  organisationId?: string;
  orgRole?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/** Décode le payload d'un JWT (base64url). Retourne `null` si invalide. */
export function decodeJwt(token: string | null | undefined): JwtClaims | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}
