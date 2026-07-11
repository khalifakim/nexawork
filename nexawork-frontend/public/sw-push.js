/**
 * Service Worker Web Push (V5.1 §7.6).
 *
 * Reçoit les notifications poussées par le Notification Service (protocole Web
 * Push / VAPID) et les affiche même quand l'onglet NexaWork est fermé. Un clic
 * ouvre — ou refocalise — l'application sur l'URL cible de la notification.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'NexaWork', body: event.data.text() };
  }

  const title = data.title || 'NexaWork';
  const options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.id || undefined,
    data: { url: data.targetUrl || '/app/accueil' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/app/accueil';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Refocalise un onglet NexaWork déjà ouvert plutôt que d'en ouvrir un autre.
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
