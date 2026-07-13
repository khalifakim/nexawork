/**
 * Montage de l'IFrame API JaaS (V5.1 §9.9.5). Mutualisé entre la salle d'un
 * membre (`salle-reunion`) et celle d'un invité externe (`salle-invite`) : les
 * deux reçoivent du backend la même paire `jitsiUrl` + `jwt`, seul le porteur
 * du jeton diffère (modérateur ou non).
 */

/** Interface minimale de l'IFrame API JaaS (chargée dynamiquement). */
export interface JitsiApi {
  addListener(event: string, handler: (payload: unknown) => void): void;
  executeCommand(command: string, ...args: unknown[]): void;
  dispose(): void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

/** Charge `external_api.js` du tenant JaaS (une seule fois par document). */
function loadExternalApi(domain: string, appId: string): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://${domain}/${appId}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('external_api load failed'));
    document.body.appendChild(script);
  });
}

/**
 * Monte la salle dans `parent` et rend l'API. Rejette si l'URL est invalide ou
 * si le script JaaS ne se charge pas — l'appelant affiche alors une vraie erreur
 * plutôt qu'un « Connexion à la salle… » perpétuel.
 */
export async function openJitsiRoom(
  parent: HTMLElement,
  jitsiUrl: string,
  jwt: string,
  displayName?: string,
): Promise<JitsiApi> {
  if (!jitsiUrl || !jwt) throw new Error('Salle vidéo indisponible (configuration JaaS manquante).');

  const url = new URL(jitsiUrl);              // ex. https://8x8.vc/{appId}/{room}
  const domain = url.host;                    // 8x8.vc
  const roomName = url.pathname.replace(/^\//, ''); // {appId}/{room}
  const appId = roomName.split('/')[0];

  await loadExternalApi(domain, appId);
  if (!window.JitsiMeetExternalAPI) throw new Error('IFrame API JaaS indisponible.');

  return new window.JitsiMeetExternalAPI(domain, {
    roomName,
    jwt,
    parentNode: parent,
    configOverwrite: { prejoinPageEnabled: false },
    ...(displayName ? { userInfo: { displayName } } : {}),
  });
}
