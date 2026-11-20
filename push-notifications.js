import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getMessaging, getToken, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyDPykm1b3Y1yA2hO_SeIAFoRyKUdUp8Ido",
  authDomain: "zune-59f3f.firebaseapp.com",
  projectId: "zune-59f3f",
  storageBucket: "zune-59f3f.firebasestorage.app",
  messagingSenderId: "969021746816",
  appId: "1:969021746816:web:1a7997693d0cae540a8065",
  measurementId: "G-64SNB2KDQM"
};

const VAPID_PUBLIC_KEY = "BOiDkV9zxZIewyc8O9GUQDM14ZFJHDTaLOacQAWLp0WlIlVVpwk2Mgk_u_jOA4juq-bMkry0qFKE_aX7zRIiUYY";

export async function setupZunePushNotifications(supabase, user) {
  const button = document.getElementById("zune-enable-push");
  const status = document.getElementById("zune-push-status");
  if (!button || !status || !user) return;

  const say = (message, isError = false) => {
    status.textContent = message;
    status.dataset.state = isError ? "error" : "success";
  };

  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    button.disabled = true;
    say("Kifaa au kivinjari hiki hakiungi mkono Web Push.", true);
    return;
  }

  if (Notification.permission === "granted") {
    button.textContent = "Arifa za kifaa zimewashwa";
  } else if (Notification.permission === "denied") {
    button.textContent = "Ruhusu arifa kwenye mipangilio ya kivinjari";
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    say("Inaandaa arifa za kifaa hiki...");

    try {
      if (!(await isSupported())) {
        throw new Error("Firebase Messaging haitumiki kwenye kivinjari hiki.");
      }

      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error("Ruhusa ya notifications haijatolewa. Ruhusu arifa kwenye browser settings.");
      }

      const registration = await navigator.serviceWorker.register(
        new URL("./firebase-messaging-sw.js", window.location.href),
        { scope: "./" }
      );

      await navigator.serviceWorker.ready;

      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: VAPID_PUBLIC_KEY,
        serviceWorkerRegistration: registration
      });

      if (!token) throw new Error("Firebase haikutoa kifaa token. Jaribu tena.");

      const { error } = await supabase
        .from("zune_push_tokens")
        .upsert({
          user_id: user.id,
          fcm_token: token,
          platform: "web",
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        }, { onConflict: "user_id,fcm_token" });

      if (error) throw error;

      button.textContent = "Arifa za kifaa zimewashwa";
      say("Kifaa hiki kimesajiliwa kupokea arifa za ZUNE. Uwasilishaji wa push kutoka server utakamilishwa kwenye hatua inayofuata.");
    } catch (error) {
      console.error("ZUNE push setup:", error);
      say(error?.message || "Imeshindikana kuwasha arifa kwenye kifaa hiki.", true);
    } finally {
      button.disabled = false;
    }
  });
}
