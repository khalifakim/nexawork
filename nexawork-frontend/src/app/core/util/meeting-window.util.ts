/**
 * Ouvre la salle de réunion, de préférence dans **sa propre fenêtre** (l'app reste
 * utilisable derrière, l'iframe JaaS n'est pas détruite à chaque navigation).
 *
 * 🔴 `noopener` a été RETIRÉ des options : avec lui, `window.open` renvoie
 * **toujours `null`**, même quand la fenêtre s'ouvre — d'où le toast trompeur
 * « autorisez les fenêtres surgissantes » qui apparaissait à chaque ouverture et
 * faisait croire à un échec. (Il n'apportait rien ici : la salle est notre propre
 * application, même origine.)
 *
 * Si le navigateur **bloque réellement** le popup (choix de l'utilisateur, ou
 * blocage des ouvertures répétées après avoir quitté puis rejoint), on n'affiche
 * plus d'erreur : la salle s'ouvre **dans l'onglet courant**. La réunion s'ouvre
 * donc toujours — cette fonction ne peut plus échouer.
 */
export function openMeetingWindow(callId: string): void {
  const url = '/salle/' + callId;
  const win = window.open(url, 'nexawork-reunion-' + callId, 'width=1280,height=800');
  if (win) {
    try { win.focus(); } catch { /* focus cross-fenêtre parfois refusé : sans importance */ }
    return;
  }
  // Popup bloqué : plutôt que de laisser l'utilisateur coincé, on ouvre la salle
  // ici même. (La salle sait revenir à l'app à la fermeture — cf. salle-reunion.)
  window.location.assign(url);
}
