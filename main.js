
/* =========================================
   ZUNE MARKETPLACE 2.0
   MAIN APPLICATION
   HTML + CSS + VANILLA JAVASCRIPT
========================================= */

const app = document.getElementById("app");

const state = {
  language: localStorage.getItem("zune_language") || "",
  screen: "language",
  signupStep: 1,
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "+255",
  email: "",
  password: "",
  confirmPassword: "",
  showPassword: false
};

/* TRANSLATIONS */

const translations = {
  sw: {
    chooseLanguage: "Chagua lugha yako",
    languageDescription: "Karibu ZUNE. Chagua lugha unayopendelea.",
    swahili: "Kiswahili",
    english: "English",
    welcome: "Karibu ZUNE!",
    subtitle: "Soko lako la kisasa. Nunua na uza kwa urahisi.",
    login: "Ingia",
    signup: "Jisajili",
    emailOrPhone: "Barua pepe au namba ya simu",
    password: "Nenosiri",
    forgot: "Umesahau nenosiri?",
    noAccount: "Huna akaunti?",
    haveAccount: "Tayari una akaunti?",
    firstName: "Jina la kwanza",
    middleName: "Jina la kati",
    lastName: "Jina la mwisho",
    phone: "Namba ya simu",
    email: "Barua pepe",
    createPassword: "Tengeneza nenosiri",
    confirmPassword: "Thibitisha nenosiri",
    continue: "Endelea",
    back: "Rudi nyuma",
    step: "Hatua",
    of: "kati ya 5",
    verifyTitle: "Thibitisha akaunti yako",
    verifyText: "Tutakutumia barua pepe yenye kiungo cha kuthibitisha akaunti yako.",
    finish: "Maliza usajili",
    required: "Tafadhali jaza sehemu zote zinazohitajika.",
    invalidPhone: "Weka namba sahihi ya simu.",
    invalidEmail: "Weka barua pepe sahihi.",
    passwordShort: "Nenosiri lazima liwe na angalau herufi 8.",
    passwordMismatch: "Nenosiri hazifanani.",
    loginMessage: "Muonekano wa kuingia umekamilika. Uthibitishaji wa Supabase utaunganishwa katika hatua inayofuata.",
    signupMessage: "Muundo wa usajili umekamilika. Uthibitishaji wa Supabase utaunganishwa katika hatua inayofuata.",
    forgotMessage: "Huduma ya kurejesha nenosiri itaunganishwa na Supabase.",
    stepOneTitle: "Tujuane kwanza",
    stepTwoTitle: "Namba yako ya simu",
    stepThreeTitle: "Barua pepe yako",
    stepFourTitle: "Linda akaunti yako",
    show: "Onyesha",
    hide: "Ficha"
  },

  en: {
    chooseLanguage: "Choose your language",
    languageDescription: "Welcome to ZUNE. Select your preferred language.",
    swahili: "Kiswahili",
    english: "English",
    welcome: "Welcome to ZUNE!",
    subtitle: "Your modern marketplace. Buy and sell with ease.",
    login: "Log In",
    signup: "Sign Up",
    emailOrPhone: "Email or Phone Number",
    password: "Password",
    forgot: "Forgot password?",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    firstName: "First Name",
    middleName: "Middle Name",
    lastName: "Last Name",
    phone: "Phone Number",
    email: "Email Address",
    createPassword: "Create Password",
    confirmPassword: "Confirm Password",
    continue: "Continue",
    back: "Go Back",
    step: "Step",
    of: "of 5",
    verifyTitle: "Verify your account",
    verifyText: "We will send you an email with a link to verify your account.",
    finish: "Complete Sign Up",
    required: "Please complete all required fields.",
    invalidPhone: "Enter a valid phone number.",
    invalidEmail: "Enter a valid email address.",
    passwordShort: "Password must contain at least 8 characters.",
    passwordMismatch: "Passwords do not match.",
    loginMessage: "The login interface is ready. Supabase authentication will be connected in the next stage.",
    signupMessage: "The signup interface is ready. Supabase authentication will be connected in the next stage.",
    forgotMessage: "Password recovery will be connected to Supabase.",
    stepOneTitle: "Let's get to know you",
    stepTwoTitle: "Your phone number",
    stepThreeTitle: "Your email address",
    stepFourTitle: "Secure your account",
    show: "Show",
    hide: "Hide"
  }
};

const t = (key) => translations[state.language || "sw"][key];

/* ADDITIONAL PAGE STYLES */

const extraStyles = document.createElement("style");

extraStyles.textContent = `
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
}

.panel {
  width: 100%;
  max-width: 430px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px 22px;
  box-shadow: var(--shadow);
}

.brand-area {
  text-align: center;
  margin-bottom: 28px;
}

.brand-area .zune-logo {
  margin-bottom: 12px;
}

.page-title {
  font-size: 25px;
  margin-bottom: 10px;
  text-align: center;
}

.page-description {
  color: var(--text-muted);
  text-align: center;
  line-height: 1.6;
  font-size: 14px;
  margin-bottom: 24px;
}

.language-option {
  width: 100%;
  padding: 17px;
  margin: 8px 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  text-align: left;
  font-weight: 700;
}

.language-option:hover {
  border-color: var(--primary);
  background: var(--background);
}

.full-button {
  width: 100%;
  margin-top: 12px;
}

.text-button {
  background: none;
  border: none;
  color: var(--primary);
  font-weight: 700;
  padding: 10px 0;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: var(--text-muted);
}

.form-footer button {
  color: var(--primary);
  background: none;
  border: none;
  font-weight: 700;
}

.progress-track {
  height: 6px;
  width: 100%;
  background: var(--border);
  border-radius: 20px;
  margin: 18px 0;
  overflow: hidden;
}

.progress-value {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s ease;
}

.step-label {
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  margin-bottom: 14px;
}

.form-error {
  color: #D93636;
  font-size: 13px;
  margin: 12px 0;
  line-height: 1.5;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 22px;
}

.form-actions button {
  flex: 1;
}

.welcome-logo {
  margin-bottom: 25px;
  transform: scale(1.2);
}

.welcome-description {
  text-align: center;
  line-height: 1.7;
  color: var(--text-muted);
  margin: 12px 0 30px;
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.password-row {
  display: flex;
  gap: 8px;
}

.password-row .form-control {
  flex: 1;
  min-width: 0;
}

.password-toggle {
  border: 1px solid var(--border);
  background: var(--background);
  color: var(--primary);
  border-radius: var(--radius-md);
  padding: 0 12px;
}

@media (max-width: 380px) {
  .panel {
    padding: 22px 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .zune-logo.wave span {
    animation: none !important;
  }
}
`;

document.head.appendChild(extraStyles);

/* LOGO */

function logo() {
  return `
    <div class="zune-logo" id="zuneLogo">
      <span class="z-letter">Ⓩ</span>
      <span class="u-letter">Ⓤ</span>
      <span class="n-letter">Ⓝ</span>
      <span class="e-letter">Ⓔ</span>
    </div>
  `;
}

/* WAVE TRANSITION */

function waveTo(callback) {
  const logoElement = document.getElementById("zuneLogo");

  if (!logoElement) {
    callback();
    return;
  }

  logoElement.classList.remove("wave");

  void logoElement.offsetWidth;

  logoElement.classList.add("wave");

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  setTimeout(callback, reducedMotion ? 50 : 850);
}

/* LANGUAGE SCREEN */

function renderLanguage() {
  state.screen = "language";

  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          ${logo()}
          <h1 class="page-title">${t("chooseLanguage")}</h1>
          <p class="page-description">
            ${t("languageDescription")}
          </p>
        </div>

        <button class="language-option" id="swahiliBtn">
          🇹🇿 &nbsp; Kiswahili
        </button>

        <button class="language-option" id="englishBtn">
          🇬🇧 &nbsp; English
        </button>
      </div>
    </section>
  `;

  document.getElementById("swahiliBtn").onclick = () => {
    chooseLanguage("sw");
  };

  document.getElementById("englishBtn").onclick = () => {
    chooseLanguage("en");
  };
}

function chooseLanguage(language) {
  state.language = language;

  localStorage.setItem("zune_language", language);

  waveTo(renderWelcome);
}

/* WELCOME SCREEN */

function renderWelcome() {
  state.screen = "welcome";

  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          <div class="welcome-logo">
            ${logo()}
          </div>

          <h1 class="page-title">
            ${t("welcome")}
          </h1>

          <p class="welcome-description">
            ${t("subtitle")}
          </p>
        </div>

        <div class="welcome-actions">
          <button class="btn btn-primary full-button" id="loginBtn">
            ${t("login")}
          </button>

          <button class="btn btn-secondary full-button" id="signupBtn">
            ${t("signup")}
          </button>
        </div>

        <p class="form-footer">
          <button id="changeLanguageBtn">
            ${state.language === "sw" ? "Badilisha lugha" : "Change language"}
          </button>
        </p>
      </div>
    </section>
  `;

  document.getElementById("loginBtn").onclick = () => {
    waveTo(renderLogin);
  };

  document.getElementById("signupBtn").onclick = () => {
    state.signupStep = 1;
    waveTo(renderSignup);
  };

  document.getElementById("changeLanguageBtn").onclick = () => {
    waveTo(renderLanguage);
  };
}

/* LOGIN SCREEN */

function renderLogin(error = "") {
  state.screen = "login";

  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          ${logo()}
          <h1 class="page-title">${t("login")}</h1>
        </div>

        <form id="loginForm">
          <div class="form-group">
            <label>${t("emailOrPhone")}</label>
            <input
              class="form-control"
              type="text"
              id="loginIdentity"
              autocomplete="username"
              required
            >
          </div>

          <div class="form-group">
            <label>${t("password")}</label>
            <div class="password-row">
              <input
                class="form-control"
                type="${state.showPassword ? "text" : "password"}"
                id="loginPassword"
                autocomplete="current-password"
                required
              >
              <button
                type="button"
                class="password-toggle"
                id="toggleLoginPassword"
              >
                ${state.showPassword ? t("hide") : t("show")}
              </button>
            </div>
          </div>

          <button type="button" class="text-button" id="forgotBtn">
            ${t("forgot")}
          </button>

          <p class="form-error">${error}</p>

          <button class="btn btn-primary full-button" type="submit">
            ${t("login")}
          </button>
        </form>

        <p class="form-footer">
          ${t("noAccount")}
          <button id="goSignup">${t("signup")}</button>
        </p>

        <p class="form-footer">
          <button id="backWelcome">${t("back")}</button>
        </p>
      </div>
    </section>
  `;

  document.getElementById("toggleLoginPassword").onclick = () => {
    state.showPassword = !state.showPassword;
    renderLogin();
  };

  document.getElementById("forgotBtn").onclick = () => {
    alert(t("forgotMessage"));
  };

  document.getElementById("goSignup").onclick = () => {
    state.signupStep = 1;
    waveTo(renderSignup);
  };

  document.getElementById("backWelcome").onclick = () => {
    waveTo(renderWelcome);
  };

  document.getElementById("loginForm").onsubmit = (event) => {
    event.preventDefault();

    alert(t("loginMessage"));
  };
}

/* SIGNUP SCREEN */

function renderSignup(error = "") {
  state.screen = "signup";

  const step = state.signupStep;

  let content = "";

  if (step === 1) {
    content = `
      <h2 class="page-title">${t("stepOneTitle")}</h2>

      <div class="form-group">
        <label>${t("firstName")}</label>
        <input class="form-control" id="firstName"
          value="${escapeHTML(state.firstName)}" required>
      </div>

      <div class="form-group">
        <label>${t("middleName")}</label>
        <input class="form-control" id="middleName"
          value="${escapeHTML(state.middleName)}" required>
      </div>

      <div class="form-group">
        <label>${t("lastName")}</label>
        <input class="form-control" id="lastName"
          value="${escapeHTML(state.lastName)}" required>
      </div>
    `;
  }

  if (step === 2) {
    content = `
      <h2 class="page-title">${t("stepTwoTitle")}</h2>

      <div class="form-group">
        <label>${t("phone")}</label>
        <input class="form-control" type="tel" id="phone"
          value="${escapeHTML(state.phone)}"
          placeholder="+255 7XXXXXXXX" required>
      </div>
    `;
  }

  if (step === 3) {
    content = `
      <h2 class="page-title">${t("stepThreeTitle")}</h2>

      <div class="form-group">
        <label>${t("email")}</label>
        <input class="form-control" type="email" id="email"
          value="${escapeHTML(state.email)}"
          autocomplete="email" required>
      </div>
    `;
  }

  if (step === 4) {
    content = `
      <h2 class="page-title">${t("stepFourTitle")}</h2>

      <div class="form-group">
        <label>${t("createPassword")}</label>
        <input class="form-control"
          type="password" id="newPassword"
          autocomplete="new-password"
          required>
      </div>

      <div class="form-group">
        <label>${t("confirmPassword")}</label>
        <input class="form-control"
          type="password" id="confirmPassword"
          autocomplete="new-password"
          required>
      </div>
    `;
  }

  if (step === 5) {
    content = `
      <h2 class="page-title">${t("verifyTitle")}</h2>

      <p class="page-description">
        ${t("verifyText")}
      </p>

      <p class="page-description">
        ${escapeHTML(state.email)}
      </p>
    `;
  }

  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          ${logo()}
          <h1 class="page-title">${t("signup")}</h1>
        </div>

        <p class="step-label">
          ${t("step")} ${step} ${t("of")}
        </p>

        <div class="progress-track">
          <div class="progress-value"
            style="width:${step * 20}%">
          </div>
        </div>

        <form id="signupForm">
          ${content}

          <p class="form-error">${error}</p>

          <div class="form-actions">
            ${
              step > 1
                ? `<button type="button" class="btn btn-secondary" id="signupBack">
                    ${t("back")}
                  </button>`
                : `<button type="button" class="btn btn-secondary" id="signupCancel">
                    ${t("back")}
                  </button>`
            }

            <button type="submit" class="btn btn-primary">
              ${step === 5 ? t("finish") : t("continue")}
            </button>
          </div>
        </form>

        <p class="form-footer">
          ${t("haveAccount")}
          <button id="goLogin">${t("login")}</button>
        </p>
      </div>
    </section>
  `;

  document.getElementById("signupForm").onsubmit = handleSignup;

  const backButton = document.getElementById("signupBack");

  if (backButton) {
    backButton.onclick = () => {
      saveSignupFields();

      state.signupStep--;

      waveTo(() => renderSignup());
    };
  }

  const cancelButton = document.getElementById("signupCancel");

  if (cancelButton) {
    cancelButton.onclick = () => {
      waveTo(renderWelcome);
    };
  }

  document.getElementById("goLogin").onclick = () => {
    waveTo(renderLogin);
  };
}

/* SAVE FORM DATA */

function saveSignupFields() {
  const fields = [
    ["firstName", "firstName"],
    ["middleName", "middleName"],
    ["lastName", "lastName"],
    ["phone", "phone"],
    ["email", "email"]
  ];

  fields.forEach(([id, key]) => {
    const input = document.getElementById(id);

    if (input) {
      state[key] = input.value.trim();
    }
  });
}

/* SIGNUP VALIDATION AND NAVIGATION */

function handleSignup(event) {
  event.preventDefault();

  saveSignupFields();

  const step = state.signupStep;

  if (step === 1) {
    if (
      !state.firstName ||
      !state.middleName ||
      !state.lastName
    ) {
      renderSignup(t("required"));
      return;
    }
  }

  if (step === 2) {
    const phoneDigits = state.phone.replace(/\D/g, "");

    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
      renderSignup(t("invalidPhone"));
      return;
    }
  }

  if (step === 3) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(state.email)) {
      renderSignup(t("invalidEmail"));
      return;
    }
  }

  if (step === 4) {
    const password = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmPassword").value;

    if (password.length < 8) {
      renderSignup(t("passwordShort"));
      return;
    }

    if (password !== confirm) {
      renderSignup(t("passwordMismatch"));
      return;
    }

    state.password = password;
    state.confirmPassword = confirm;
  }

  if (step === 5) {
    alert(t("signupMessage"));
    return;
  }

  state.signupStep++;

  waveTo(() => renderSignup());
}

/* SAFE HTML VALUES */

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

/* START APPLICATION */

if (state.language) {
  renderWelcome();
} else {
  renderLanguage();
}
