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

/** Identité NexaWork transmise à JaaS — l'utilisateur ne resaisit jamais son nom. */
export interface JitsiUser {
  displayName?: string;
  email?: string;
}

/**
 * Monte la salle dans `parent` et rend l'API. Rejette si l'URL est invalide ou
 * si le script JaaS ne se charge pas — l'appelant affiche alors une vraie erreur
 * plutôt qu'un « Connexion à la salle… » perpétuel.
 *
 * `onError` remonte les erreurs émises par JaaS APRÈS le montage (jeton refusé,
 * conférence inaccessible…). Sans lui, elles restaient enfermées dans l'iframe :
 * l'application ne pouvait ni les afficher ni les journaliser, et un « Authentication
 * failed » ne laissait aucune trace côté NexaWork.
 */
export async function openJitsiRoom(
  parent: HTMLElement,
  jitsiUrl: string,
  jwt: string,
  user?: JitsiUser,
  onError?: (message: string) => void,
  options?: { enableLobby?: boolean },
): Promise<JitsiApi> {
  if (!jitsiUrl || !jwt) throw new Error('Salle vidéo indisponible (configuration JaaS manquante).');

  const url = new URL(jitsiUrl);              // ex. https://8x8.vc/{appId}/{room}
  const domain = url.host;                    // 8x8.vc
  const roomName = url.pathname.replace(/^\//, ''); // {appId}/{room}
  const appId = roomName.split('/')[0];

  await loadExternalApi(domain, appId);
  if (!window.JitsiMeetExternalAPI) throw new Error('IFrame API JaaS indisponible.');

  const api = new window.JitsiMeetExternalAPI(domain, {
    roomName,
    jwt,
    parentNode: parent,
    configOverwrite: {
      // `prejoinConfig.enabled` est l'option COURANTE ; `prejoinPageEnabled` est
      // son ancien nom, désormais ignoré par Jitsi — c'est pour cela que l'écran
      // de pré-connexion réclamait encore le nom. Les deux sont posées : le
      // tenant JaaS peut tourner sur une version antérieure.
      prejoinConfig: { enabled: false },
      prejoinPageEnabled: false,
      // Salle d'attente. Le backend émet déjà `lobby_bypass` (vrai pour les membres
      // authentifiés, faux pour l'invité externe) — mais ce claim ne sert À RIEN
      // tant que le lobby n'est pas ACTIVÉ dans la salle : sans lui, tout le monde
      // entre directement, y compris l'invité externe. Seul le modérateur l'active
      // (il est le premier dans la salle, et JaaS n'accepte l'activation que de lui).
      ...(options?.enableLobby ? { lobby: { autoKnock: true, enableChat: false } } : {}),
    },
    // L'utilisateur est DÉJÀ authentifié sur NexaWork : son nom est porté par le
    // JWT (`context.user.name`) et repris ici, il n'a donc rien à ressaisir.
    ...(user?.displayName || user?.email
      ? { userInfo: { displayName: user.displayName, email: user.email } }
      : {}),
  });

  // Le lobby s'active par COMMANDE, une fois la conférence rejointe : la config
  // seule ne le déclenche pas côté JaaS. Le modérateur l'arme donc à son entrée —
  // les membres conviés le traversent grâce à `lobby_bypass`, l'invité externe y
  // reste et le modérateur reçoit sa demande d'admission (« knocking »).
  if (options?.enableLobby) {
    api.addListener('videoConferenceJoined', () => {
      try {
        api.executeCommand('toggleLobby', true);
      } catch {
        /* Tenant sans lobby : la réunion reste utilisable, sans salle d'attente. */
      }
    });
  }

  if (onError) {
    // JaaS refusant le jeton émet `errorOccurred` : sans écoute, l'utilisateur ne
    // voyait qu'un « Authentication failed » à l'intérieur de l'iframe, sans
    // qu'aucun diagnostic ne remonte.
    api.addListener('errorOccurred', (payload: unknown) => {
      const err = payload as { error?: { message?: string; name?: string } } | undefined;
      const name = err?.error?.name ?? '';
      const message = err?.error?.message ?? '';
      console.error('[JaaS] errorOccurred', payload);
      onError(describeJitsiError(name, message));
    });
  }
  return api;
}

/**
 * Traduit une erreur JaaS en message actionnable. Le cas de loin le plus fréquent
 * est le refus du jeton : il ne vient PAS de la salle mais de la configuration du
 * tenant (clé publique enregistrée dans la console 8x8 ≠ clé privée qui signe).
 */
function describeJitsiError(name: string, message: string): string {
  const raw = (name + ' ' + message).toLowerCase();
  if (raw.includes('auth') || raw.includes('token') || raw.includes('jwt')) {
    return "La visioconférence a refusé le jeton d'accès (JaaS). "
      + 'La clé publique enregistrée dans la console 8x8 ne correspond probablement '
      + "pas à la clé privée qui signe les jetons. Détail technique : " + (message || name || 'inconnu');
  }
  return message || name || 'Erreur de la visioconférence.';
}
