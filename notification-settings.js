
/* =========================================
   ZUNE NOTIFICATION SETTINGS
========================================= */

const SETTINGS_KEY = "zune-notification-settings";

const defaultSettings = {
  language: "sw",
  browserNotifications: false
};

let settings = loadSettings();

function loadSettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(SETTINGS_KEY)
    );

    return {
      ...defaultSettings,
      ...(saved || {})
    };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify(settings)
  );
}

function getLanguage() {
  return settings.language === "en" ? "en" : "sw";
}

/* =========================================
   TRANSLATIONS
========================================= */

const words = {
  sw: {
    title: "Mipangilio ya Arifa",
    language: "Lugha",
    languageDescription: "Chagua lugha ya arifa zako.",
    browser: "Arifa za Browser",
    browserDescription:
      "Pokea taarifa kwenye browser hata ukiwa kwenye ukurasa mwingine.",
    enabled: "Zimewashwa",
    disabled: "Zimezimwa",
    save: "Hifadhi mipangilio",
    close: "Funga",
    permission:
      "Browser haijaruhusu arifa. Tafadhali ruhusu kupitia mipangilio ya browser yako.",
    unsupported:
      "Browser hii haitumii arifa za mfumo.",
    saved: "Mipangilio imehifadhiwa."
  },

  en: {
    title: "Notification Settings",
    language: "Language",
    languageDescription: "Choose your notification language.",
    browser: "Browser Notifications",
    browserDescription:
      "Receive alerts from your browser while using other pages.",
    enabled: "Enabled",
    disabled: "Disabled",
    save: "Save settings",
    close: "Close",
    permission:
      "Browser notifications are not allowed. Please enable them in your browser settings.",
    unsupported:
      "This browser does not support system notifications.",
    saved: "Settings saved."
  }
};

function word(key) {
  return words[getLanguage()][key] || key;
}

/* =========================================
   CREATE SETTINGS MODAL
========================================= */

function createSettingsModal() {
  if (document.getElementById("zune-settings-modal")) return;

  const modal = document.createElement("div");

  modal.id = "zune-settings-modal";
  modal.className = "zune-settings-overlay";
  modal.hidden = true;

  modal.innerHTML = `
    <section
      class="zune-settings-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="zune-settings-title"
    >

      <header class="zune-settings-header">
        <h2 id="zune-settings-title"></h2>

        <button
          type="button"
          id="zune-settings-close"
          aria-label="Close"
        >×</button>
      </header>

      <div class="zune-settings-option">
        <label for="zune-settings-language">
          <strong id="zune-language-label"></strong>
          <small id="zune-language-description"></small>
        </label>

        <select id="zune-settings-language">
          <option value="sw">Kiswahili</option>
          <option value="en">English</option>
        </select>
      </div>

      <div class="zune-settings-option">
        <label for="zune-browser-notifications">
          <strong id="zune-browser-label"></strong>
          <small id="zune-browser-description"></small>
        </label>

        <input
          type="checkbox"
          id="zune-browser-notifications"
        >
      </div>

      <p
        id="zune-settings-status"
        role="status"
        aria-live="polite"
      ></p>

      <footer class="zune-settings-footer">
        <button
          type="button"
          id="zune-settings-save"
        ></button>
      </footer>

    </section>
  </div>
  `;

  document.body.appendChild(modal);

  addSettingsStyles();
  updateSettingsLabels();
  attachSettingsEvents();
}

/* =========================================
   STYLES
========================================= */

function addSettingsStyles() {
  if (document.getElementById("zune-settings-styles")) return;

  const style = document.createElement("style");

  style.id = "zune-settings-styles";

  style.textContent = `
    .zune-settings-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(0, 0, 0, 0.48);
    }

    .zune-settings-overlay[hidden] {
      display: none;
    }

    .zune-settings-panel {
      width: 100%;
      max-width: 430px;
      padding: 22px;
      border-radius: 20px;
      background: var(--bg-primary, #fff);
      color: var(--text-primary, #17231e);
      box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
    }

    .zune-settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      margin-bottom: 20px;
    }

    .zune-settings-header h2 {
      margin: 0;
      font-size: 19px;
    }

    #zune-settings-close {
      width: 35px;
      height: 35px;
      border: none;
      border-radius: 10px;
      background: var(--bg-secondary, #f3f6f4);
      color: inherit;
      font-size: 24px;
      cursor: pointer;
    }

    .zune-settings-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      padding: 16px 0;
      border-bottom: 1px solid var(--border-color, #e5ebe7);
    }

    .zune-settings-option label {
      display: flex;
      flex-direction: column;
      gap: 5px;
      flex: 1;
    }

    .zune-settings-option strong {
      font-size: 14px;
    }

    .zune-settings-option small {
      color: var(--text-secondary, #748079);
      font-size: 11px;
      line-height: 1.5;
    }

    .zune-settings-option select {
      max-width: 125px;
      padding: 9px;
      border: 1px solid var(--border-color, #e5ebe7);
      border-radius: 9px;
      background: var(--bg-secondary, #f5f7f6);
      color: inherit;
    }

    .zune-settings-option input[type="checkbox"] {
      width: 21px;
      height: 21px;
      accent-color: var(--primary-color, #087a55);
    }

    #zune-settings-status {
      min-height: 18px;
      color: var(--text-secondary, #748079);
      font-size: 12px;
      line-height: 1.5;
    }

    .zune-settings-footer {
      margin-top: 15px;
    }

    #zune-settings-save {
      width: 100%;
      padding: 13px;
      border: none;
      border-radius: 12px;
      background: var(--primary-color, #087a55);
      color: white;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
    }
  `;

  document.head.appendChild(style);
}

/* =========================================
   UPDATE LABELS
========================================= */

function updateSettingsLabels() {
  const modal = document.getElementById("zune-settings-modal");

  if (!modal) return;

  document.getElementById("zune-settings-title").textContent =
    word("title");

  document.getElementById("zune-language-label").textContent =
    word("language");

  document.getElementById("zune-language-description").textContent =
    word("languageDescription");

  document.getElementById("zune-browser-label").textContent =
    word("browser");

  document.getElementById("zune-browser-description").textContent =
    word("browserDescription");

  document.getElementById("zune-settings-save").textContent =
    word("save");

  document.getElementById("zune-settings-close").setAttribute(
    "aria-label",
    word("close")
  );
}

/* =========================================
   OPEN / CLOSE
========================================= */

function openSettings() {
  const modal = document.getElementById("zune-settings-modal");

  document.getElementById("zune-settings-language").value =
    settings.language;

  document.getElementById("zune-browser-notifications").checked =
    settings.browserNotifications;

  document.getElementById("zune-settings-status").textContent = "";

  modal.hidden = false;
}

function closeSettings() {
  document.getElementById("zune-settings-modal").hidden = true;
}

/* =========================================
   SAVE SETTINGS
========================================= */

async function saveUserSettings() {
  const language = document.getElementById(
    "zune-settings-language"
  ).value;

  const browserEnabled = document.getElementById(
    "zune-browser-notifications"
  ).checked;

  if (
    browserEnabled &&
    !("Notification" in window)
  ) {
    showSettingsMessage(word("unsupported"));
    return;
  }

  if (
    browserEnabled &&
    Notification.permission === "default"
  ) {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      showSettingsMessage(word("permission"));
      return;
    }
  }

  if (
    browserEnabled &&
    Notification.permission !== "granted"
  ) {
    showSettingsMessage(word("permission"));
    return;
  }

  settings = {
    language,
    browserNotifications: browserEnabled
  };

  saveSettings();

  localStorage.setItem("zune-language", language);

  updateSettingsLabels();

  showSettingsMessage(word("saved"));
}

/* =========================================
   STATUS MESSAGE
========================================= */

function showSettingsMessage(message) {
  document.getElementById(
    "zune-settings-status"
  ).textContent = message;
}

/* =========================================
   EVENTS
========================================= */

function attachSettingsEvents() {
  document.getElementById("zune-settings-close")
    .addEventListener("click", closeSettings);

  document.getElementById("zune-settings-save")
    .addEventListener("click", saveUserSettings);

  document.getElementById("zune-settings-language")
    .addEventListener("change", (event) => {
      const selectedLanguage = event.target.value;

      const language = selectedLanguage === "en" ? "en" : "sw";

      const labels = words[language];

      document.getElementById("zune-settings-title").textContent =
        labels.title;

      document.getElementById("zune-language-label").textContent =
        labels.language;

      document.getElementById("zune-language-description").textContent =
        labels.languageDescription;

      document.getElementById("zune-browser-label").textContent =
        labels.browser;

      document.getElementById("zune-browser-description").textContent =
        labels.browserDescription;

      document.getElementById("zune-settings-save").textContent =
        labels.save;
    });

  document.getElementById("zune-settings-modal")
    .addEventListener("click", (event) => {
      if (event.target.id === "zune-settings-modal") {
        closeSettings();
      }
    });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSettings();
    }
  });
}

/* =========================================
   CONNECT SETTINGS BUTTON
========================================= */

function initializeSettings() {
  createSettingsModal();

  const button = document.getElementById(
    "notification-settings-button"
  );

  if (button) {
    button.addEventListener("click", openSettings);
  }
}

initializeSettings();

/* =========================================
   PUBLIC SETTINGS API
========================================= */

window.ZuneNotificationSettings = {
  getSettings: () => ({ ...settings }),
  getLanguage,
  open: openSettings,
  close: closeSettings
};
