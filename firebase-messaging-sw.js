/* ZUNE Firebase Cloud Messaging service worker.
   This file must remain at the website root for GitHub Pages scope. */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDPykm1b3Y1yA2hO_SeIAFoRyKUdUp8Ido",
  authDomain: "zune-59f3f.firebaseapp.com",
  projectId: "zune-59f3f",
  storageBucket: "zune-59f3f.firebasestorage.app",
  messagingSenderId: "969021746816",
  appId: "1:969021746816:web:1a7997693d0cae540a8065",
  measurementId: "G-64SNB2KDQM"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "ZUNE";
  const body = payload.notification?.body || payload.data?.body || "Una taarifa mpya kutoka ZUNE.";
  const target = payload.data?.url || payload.data?.action_url || "./notifications.html";

  return self.registration.showNotification(title, {
    body,
    data: { url: target },
    tag: payload.data?.tag || "zune-notification",
    renotify: false
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || "./notifications.html";
  let target;
  try {
    target = new URL(rawUrl, self.location.origin);
    if (target.origin !== self.location.origin) target = new URL("./notifications.html", self.location.origin);
  } catch {
    target = new URL("./notifications.html", self.location.origin);
  }

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.navigate(target.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(target.href);
  })());
});
