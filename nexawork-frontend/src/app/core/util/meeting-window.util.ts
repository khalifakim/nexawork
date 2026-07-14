/**
 * Ouverture de la salle de réunion. Elle vit dans sa **propre fenêtre** : l'app
 * reste utilisable derrière, et l'iframe JaaS n'est pas détruite à chaque
 * navigation.
 *
 * Rend `false` si le navigateur a bloqué la fenêtre surgissante — cas qui
 * échouait auparavant EN SILENCE (le clic « ne faisait rien »). L'appelant est
 * tenu d'en informer l'utilisateur.
 */
export function openMeetingWindow(callId: string): boolean {
  const win = window.open(
    '/salle/' + callId,
    'nexawork-reunion-' + callId,
    'width=1280,height=800,noopener',
  );
  return !!win;
}
