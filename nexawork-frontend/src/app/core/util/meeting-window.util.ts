/**
 * Ouvre la salle de réunion dans un **nouvel onglet** (et non un popup).
 *
 * `window.open(url, '_blank')` **sans** options de taille ouvre un onglet à côté
 * de l'onglet courant — l'ancienne version passait `width=…,height=…`, ce qui
 * force une fenêtre popup, bien plus souvent bloquée par les navigateurs.
 *
 * ⚠️ À n'appeler QUE dans un vrai geste utilisateur (handler de clic direct) :
 * sinon le navigateur bloque l'ouverture. Pour la **création** de réunion, où la
 * salle s'ouvre après un appel réseau (hors geste), voir `openBlankTab()`.
 *
 * Si l'ouverture est tout de même refusée, on navigue dans l'onglet courant plutôt
 * que de laisser l'utilisateur coincé : la réunion s'ouvre donc toujours.
 */
export function openMeetingWindow(callId: string): void {
  const url = '/salle/' + callId;
  const tab = window.open(url, '_blank');
  if (tab) {
    try { tab.focus(); } catch { /* focus cross-onglet parfois refusé : sans importance */ }
    return;
  }
  window.location.assign(url);
}

/**
 * Ouvre un onglet **vide immédiatement**, dans le geste de clic, avant tout appel
 * réseau. À utiliser quand l'URL n'est connue qu'ensuite (création de réunion :
 * l'id d'appel arrive après le POST). L'appelant redirige l'onglet avec
 * `redirectTab()` une fois l'id obtenu, ou le ferme avec `closeTab()` en cas d'échec.
 *
 * C'est LA parade au blocage des popups : le navigateur autorise l'ouverture parce
 * qu'elle a lieu pendant le geste ; la redirection ultérieure, elle, n'est jamais bloquée.
 */
export function openBlankTab(): Window | null {
  return window.open('', '_blank');
}

/** Redirige l'onglet pré-ouvert vers la salle (ou l'onglet courant s'il a été bloqué). */
export function redirectTab(tab: Window | null, callId: string): void {
  const url = '/salle/' + callId;
  if (tab && !tab.closed) {
    tab.location.href = url;
    try { tab.focus(); } catch { /* sans importance */ }
  } else {
    window.location.assign(url);
  }
}

/** Ferme l'onglet pré-ouvert (échec de création). */
export function closeTab(tab: Window | null): void {
  if (tab && !tab.closed) tab.close();
}
