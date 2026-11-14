
import { supabase } from "./supabase.js";

/* =====================================
   ZUNE NOTIFICATION BELL
===================================== */

const MOUNT_ID = "zune-notification-bell";

let currentUser = null;
let realtimeChannel = null;

const mount = document.getElementById(MOUNT_ID);

if (mount) {
  initializeBell();
}

/* =====================================
   STYLES
===================================== */

function addBellStyles() {
  if (document.getElementById("zune-bell-styles")) return;

  const style = document.createElement("style");

  style.id = "zune-bell-styles";

  style.textContent = `
    #${MOUNT_ID} {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .zune-bell-link {
      position: relative;
      width: 42px;
      height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border-color, #e5ebe7);
      border-radius: 13px;
      background: var(--bg-secondary, #f5f7f6);
      color: var(--text-primary, #17231e);
      text-decoration: none;
      font-size: 21px;
      cursor: pointer;
    }

    .zune-bell-count {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--bg-primary, #ffffff);
      border-radius: 20px;
      background: #e54848;
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
    }

    .zune-bell-count[hidden] {
      display: none;
    }
  `;

  document.head.appendChild(style);
}

/* =====================================
   CREATE BELL
===================================== */

function renderBell() {
  addBellStyles();

  mount.innerHTML = "";

  const link = document.createElement("a");

  link.href = "./notifications.html";
  link.className = "zune-bell-link";
  link.setAttribute("aria-label", "Notifications");
  link.setAttribute("title", "Notifications");

  const icon = document.createElement("span");
  icon.textContent = "🔔";

  const count = document.createElement("span");

  count.className = "zune-bell-count";
  count.id = "zune-bell-unread-count";
  count.hidden = true;
  count.textContent = "0";

  link.append(icon, count);
  mount.appendChild(link);
}

/* =====================================
   LOAD UNREAD COUNT
===================================== */

async function loadUnreadCount() {
  if (!currentUser) return;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", {
      count: "exact",
      head: true
    })
    .eq("user_id", currentUser.id)
    .eq("is_read", false);

  if (error) {
    console.error("ZUNE bell error:", error);
    return;
  }

  updateBellCount(count || 0);
}

/* =====================================
   UPDATE BADGE
===================================== */

function updateBellCount(total) {
  const badge = document.getElementById(
    "zune-bell-unread-count"
  );

  if (!badge) return;

  badge.textContent = total > 99 ? "99+" : String(total);
  badge.hidden = total === 0;
}

/* =====================================
   REALTIME
===================================== */

function subscribeToNotifications() {
  if (!currentUser) return;

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel(`zune-bell-${currentUser.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${currentUser.id}`
      },
      () => {
        loadUnreadCount();
      }
    )
    .subscribe((status) => {
      console.log("ZUNE bell realtime:", status);
    });
}

/* =====================================
   INITIALIZE
===================================== */

async function initializeBell() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    mount.innerHTML = "";
    return;
  }

  currentUser = data.user;

  renderBell();

  await loadUnreadCount();

  subscribeToNotifications();

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session?.user) {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }

      currentUser = null;
      mount.innerHTML = "";
      return;
    }

    if (event === "SIGNED_IN") {
      currentUser = session.user;
      renderBell();
      loadUnreadCount();
      subscribeToNotifications();
    }
  });
}

/* =====================================
   CLEANUP
===================================== */

window.addEventListener("pagehide", () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
});
