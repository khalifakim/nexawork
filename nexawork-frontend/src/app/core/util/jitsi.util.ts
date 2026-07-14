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
  options?: { onInviteClicked?: () => void },
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
      // Onglets « sondages » et « CC » (sous-titres) retirés du panneau de chat.
      // Le drapeau JWT (`create-polls`/`transcription` à false) en interdit l'USAGE,
      // mais l'onglet resterait affiché — il faut aussi le masquer côté interface.
      // La transcription est facturée par 8x8 (0,06 $/min) : on ne l'expose pas.
      disablePolls: true,
      transcription: { enabled: false },
      // Boutons correspondants retirés de la barre d'outils (sondages, sous-titres) —
      // ainsi que l'enregistrement et le streaming, facturés à la minute et hors
      // périmètre (V5.1 §14.4). Le drapeau JWT les refuserait de toute façon : autant
      // ne pas afficher un bouton qui ne peut qu'échouer.
      // `filesharing` retiré aussi : NexaWork assure son propre partage (le fichier
      // part au File Service → MinIO, et reste téléchargeable après la réunion).
      // Le bouton de JaaS téléverserait chez 8x8, hors de notre portée.
      hiddenToolbarButtons: ['polls', 'closedcaptions', 'recording', 'livestreaming', 'filesharing'],
      // 🔴 SALLE D'ATTENTE (lobby) DÉSACTIVÉE — décision imposée par JaaS.
      //
      // Le claim `lobby_bypass` sur lequel reposait le contournement **n'existe pas**
      // dans la spécification JaaS (seuls id/name/email/avatar/moderator/
      // hidden-from-recorder sont reconnus). Il était donc ignoré : lobby activé ⇒
      // PERSONNE ne le contournait, et tout membre convié était rejeté
      // (« conference.connectionError.membersOnly »), seul le modérateur entrait.
      //
      // Le lobby de JaaS est du tout-ou-rien : impossible d'y soumettre le seul invité
      // externe. Entre « les membres entrent directement » (exigence) et « l'externe
      // patiente » (confort), on garde le premier.
      //
      // ⚠️ Aucune perte de sécurité — le lobby n'a JAMAIS été le contrôle d'accès :
      //   • membre : `join()` exige d'être hôte ou convié (404 sinon) ;
      //   • invité externe : lien à **usage unique** vérifié en base.
      // Sans invitation, on n'obtient aucun jeton — donc aucune entrée.
      // Détourne le bouton « Inviter » de Jitsi vers NOTRE modal : `preventExecution`
      // supprime la fenêtre d'invitation native (qui ne connaît ni nos membres, ni
      // nos invitations par email), et le clic nous est notifié via `toolbarButtonClicked`.
      ...(options?.onInviteClicked
        ? { buttonsWithNotifyClick: [{ key: 'invite', preventExecution: true }] }
        : {}),
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

  if (options?.onInviteClicked) {
    api.addListener('toolbarButtonClicked', (payload: unknown) => {
      const key = (payload as { key?: string } | undefined)?.key;
      if (key === 'invite') options.onInviteClicked!();
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
