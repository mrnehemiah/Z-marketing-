
import {
  registerCustomer,
  loginCustomer,
  recoverPassword,
  getCustomerSession,
  logoutCustomer
} from "./auth.js";

const app = document.getElementById("app");

const state = {
  language: localStorage.getItem("zune_language") || "",
  signupStep: 1,
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "+255",
  email: "",
  password: "",
  busy: false
};

const translations = {
  sw: {
    choose: "Chagua lugha yako",
    description: "Karibu ZUNE. Chagua lugha unayopendelea.",
    welcome: "Karibu ZUNE!",
    subtitle: "Soko lako la kisasa. Nunua na uza kwa urahisi.",
    login: "Ingia",
    signup: "Jisajili",
    email: "Barua pepe",
    phone: "Namba ya simu",
    password: "Nenosiri",
    forgot: "Umesahau nenosiri?",
    first: "Jina la kwanza",
    middle: "Jina la kati",
    last: "Jina la mwisho",
    createPassword: "Tengeneza nenosiri",
    confirmPassword: "Thibitisha nenosiri",
    continue: "Endelea",
    back: "Rudi nyuma",
    finish: "Maliza usajili",
    step: "Hatua",
    of: "kati ya 5",
    verify: "Thibitisha akaunti yako",
    verifyText: "Tumetuma kiungo cha uthibitishaji kwenye barua pepe yako. Fungua ujumbe huo kuthibitisha akaunti yako.",
    required: "Tafadhali jaza sehemu zote.",
    invalidPhone: "Namba ya simu si sahihi.",
    invalidEmail: "Barua pepe si sahihi.",
    shortPassword: "Nenosiri liwe na angalau herufi 8.",
    mismatch: "Nenosiri hazifanani.",
    loginError: "Imeshindikana kuingia. Hakikisha taarifa zako ni sahihi.",
    signupError: "Usajili haujakamilika.",
    resetSent: "Maelekezo ya kubadilisha nenosiri yametumwa kwenye email yako.",
    resetAsk: "Weka barua pepe yako kwanza.",
    logout: "Toka",
    account: "Akaunti yako",
    signedIn: "Umeingia kwenye akaunti yako.",
    marketplaceSoon: "Marketplace itaunganishwa katika hatua inayofuata.",
    haveAccount: "Tayari una akaunti?",
    noAccount: "Huna akaunti?",
    show: "Onyesha",
    hide: "Ficha",
    changeLanguage: "Badilisha lugha"
  },

  en: {
    choose: "Choose your language",
    description: "Welcome to ZUNE. Select your preferred language.",
    welcome: "Welcome to ZUNE!",
    subtitle: "Your modern marketplace. Buy and sell with ease.",
    login: "Log In",
    signup: "Sign Up",
    email: "Email Address",
    phone: "Phone Number",
    password: "Password",
    forgot: "Forgot password?",
    first: "First Name",
    middle: "Middle Name",
    last: "Last Name",
    createPassword: "Create Password",
    confirmPassword: "Confirm Password",
    continue: "Continue",
    back: "Go Back",
    finish: "Complete Sign Up",
    step: "Step",
    of: "of 5",
    verify: "Verify your account",
    verifyText: "We sent a verification link to your email. Open that message to verify your account.",
    required: "Please complete all required fields.",
    invalidPhone: "Invalid phone number.",
    invalidEmail: "Invalid email address.",
    shortPassword: "Password must contain at least 8 characters.",
    mismatch: "Passwords do not match.",
    loginError: "Unable to log in. Check your details.",
    signupError: "Sign up could not be completed.",
    resetSent: "Password recovery instructions have been sent to your email.",
    resetAsk: "Enter your email address first.",
    logout: "Log Out",
    account: "Your Account",
    signedIn: "You are signed in.",
    marketplaceSoon: "Marketplace will be connected in the next stage.",
    haveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    show: "Show",
    hide: "Hide",
    changeLanguage: "Change language"
  }
};

const t = key => translations[state.language || "sw"][key];

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

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function waveTo(callback) {
  const element = document.getElementById("zuneLogo");

  if (!element) {
    callback();
    return;
  }

  element.classList.remove("wave");
  void element.offsetWidth;
  element.classList.add("wave");

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  setTimeout(callback, reducedMotion ? 50 : 850);
}

function showError(message) {
  const element = document.getElementById("formError");

  if (element) {
    element.textContent = message;
  }
}

function setBusy(value) {
  state.busy = value;

  app.querySelectorAll("button").forEach(button => {
    button.disabled = value;
  });
}

/* LANGUAGE SELECTION */

function renderLanguage() {
  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          ${logo()}
          <h1 class="page-title">${t("choose")}</h1>
          <p class="page-description">${t("description")}</p>
        </div>

        <button class="language-option" id="swBtn">
          🇹🇿 Kiswahili
        </button>

        <button class="language-option" id="enBtn">
          🇬🇧 English
        </button>
      </div>
    </section>
  `;

  document.getElementById("swBtn").onclick = () => {
    chooseLanguage("sw");
  };

  document.getElementById("enBtn").onclick = () => {
    chooseLanguage("en");
  };
}

function chooseLanguage(language) {
  state.language = language;
  localStorage.setItem("zune_language", language);
  waveTo(renderWelcome);
}

/* WELCOME */

function renderWelcome() {
  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          <div class="welcome-logo">
            ${logo()}
          </div>

          <h1 class="page-title">${t("welcome")}</h1>
          <p class="welcome-description">${t("subtitle")}</p>
        </div>

        <div class="welcome-actions">
          <button class="btn btn-primary" id="loginBtn">
            ${t("login")}
          </button>

          <button class="btn btn-secondary" id="signupBtn">
            ${t("signup")}
          </button>
        </div>

        <p class="form-footer">
          <button id="languageBtn">${t("changeLanguage")}</button>
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

  document.getElementById("languageBtn").onclick = () => {
    waveTo(renderLanguage);
  };
}

/* LOGIN */

function renderLogin(error = "") {
  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          ${logo()}
          <h1 class="page-title">${t("login")}</h1>
        </div>

        <form id="loginForm">
          <div class="form-group">
            <label>${t("email")}</label>
            <input
              class="form-control"
              id="loginEmail"
              type="email"
              autocomplete="username"
              required
            >
          </div>

          <div class="form-group">
            <label>${t("password")}</label>

            <div class="password-row">
              <input
                class="form-control"
                id="loginPassword"
                type="password"
                autocomplete="current-password"
                required
              >

              <button
                class="password-toggle"
                type="button"
                id="showLoginPassword"
              >
                ${t("show")}
              </button>
            </div>
          </div>

          <button class="text-button" type="button" id="forgotBtn">
            ${t("forgot")}
          </button>

          <p class="form-error" id="formError">
            ${escapeHTML(error)}
          </p>

          <button class="btn btn-primary full-button" type="submit">
            ${t("login")}
          </button>
        </form>

        <p class="form-footer">
          ${t("noAccount")}
          <button id="signupLink">${t("signup")}</button>
        </p>

        <p class="form-footer">
          <button id="welcomeLink">${t("back")}</button>
        </p>
      </div>
    </section>
  `;

  document.getElementById("showLoginPassword").onclick = () => {
    const input = document.getElementById("loginPassword");
    const button = document.getElementById("showLoginPassword");

    input.type = input.type === "password" ? "text" : "password";

    button.textContent =
      input.type === "password" ? t("show") : t("hide");
  };

  document.getElementById("loginForm").onsubmit = async event => {
    event.preventDefault();

    if (state.busy) return;

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    setBusy(true);

    try {
      await loginCustomer(email, password);
      renderAccount();
    } catch (error) {
      showError(t("loginError"));
    } finally {
      setBusy(false);
    }
  };

  document.getElementById("forgotBtn").onclick = async () => {
    if (state.busy) return;

    const email = document.getElementById("loginEmail").value.trim();

    if (!email) {
      showError(t("resetAsk"));
      return;
    }

    setBusy(true);

    try {
      await recoverPassword(email);
      alert(t("resetSent"));
    } catch (error) {
      showError(error.message || t("loginError"));
    } finally {
      setBusy(false);
    }
  };

  document.getElementById("signupLink").onclick = () => {
    state.signupStep = 1;
    waveTo(renderSignup);
  };

  document.getElementById("welcomeLink").onclick = () => {
    waveTo(renderWelcome);
  };
}

/* SIGN UP - FIVE STEPS */

function renderSignup(error = "") {
  const step = state.signupStep;
  let content = "";

  if (step === 1) {
    content = `
      <div class="form-group">
        <label>${t("first")}</label>
        <input
          class="form-control"
          id="firstName"
          value="${escapeHTML(state.firstName)}"
          required
        >
      </div>

      <div class="form-group">
        <label>${t("middle")}</label>
        <input
          class="form-control"
          id="middleName"
          value="${escapeHTML(state.middleName)}"
          required
        >
      </div>

      <div class="form-group">
        <label>${t("last")}</label>
        <input
          class="form-control"
          id="lastName"
          value="${escapeHTML(state.lastName)}"
          required
        >
      </div>
    `;
  }

  if (step === 2) {
    content = `
      <div class="form-group">
        <label>${t("phone")}</label>
        <input
          class="form-control"
          id="phone"
          type="tel"
          value="${escapeHTML(state.phone)}"
          required
        >
      </div>
    `;
  }

  if (step === 3) {
    content = `
      <div class="form-group">
        <label>${t("email")}</label>
        <input
          class="form-control"
          id="email"
          type="email"
          value="${escapeHTML(state.email)}"
          required
        >
      </div>
    `;
  }

  if (step === 4) {
    content = `
      <div class="form-group">
        <label>${t("createPassword")}</label>
        <input
          class="form-control"
          id="newPassword"
          type="password"
          autocomplete="new-password"
          required
        >
      </div>

      <div class="form-group">
        <label>${t("confirmPassword")}</label>
        <input
          class="form-control"
          id="confirmPassword"
          type="password"
          autocomplete="new-password"
          required
        >
      </div>
    `;
  }

  if (step === 5) {
    content = `
      <h2 class="page-title">${t("verify")}</h2>
      <p class="page-description">${t("verifyText")}</p>
      <p>${escapeHTML(state.email)}</p>
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
          <div
            class="progress-value"
            style="width:${step * 20}%"
          ></div>
        </div>

        <form id="signupForm">
          ${content}

          <p class="form-error" id="formError">
            ${escapeHTML(error)}
          </p>

          <div class="form-actions">
            <button
              type="button"
              class="btn btn-secondary"
              id="backBtn"
            >
              ${t("back")}
            </button>

            <button type="submit" class="btn btn-primary">
              ${step === 5 ? t("finish") : t("continue")}
            </button>
          </div>
        </form>

        <p class="form-footer">
          ${t("haveAccount")}
          <button id="loginLink">${t("login")}</button>
        </p>
      </div>
    </section>
  `;

  document.getElementById("signupForm").onsubmit = handleSignup;

  document.getElementById("backBtn").onclick = () => {
    if (state.busy) return;

    if (step === 1) {
      waveTo(renderWelcome);
      return;
    }

    saveSignupFields();
    state.signupStep--;
    waveTo(() => renderSignup());
  };

  document.getElementById("loginLink").onclick = () => {
    waveTo(renderLogin);
  };
}

function saveSignupFields() {
  ["firstName", "middleName", "lastName", "phone", "email"]
    .forEach(id => {
      const input = document.getElementById(id);

      if (input) {
        state[id] = input.value.trim();
      }
    });
}

async function handleSignup(event) {
  event.preventDefault();

  if (state.busy) return;

  const step = state.signupStep;
  saveSignupFields();

  if (step === 1) {
    if (!state.firstName || !state.middleName || !state.lastName) {
      showError(t("required"));
      return;
    }
  }

  if (step === 2) {
    const digits = state.phone.replace(/\D/g, "");

    if (digits.length < 9 || digits.length > 15) {
      showError(t("invalidPhone"));
      return;
    }
  }

  if (step === 3) {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!validEmail.test(state.email)) {
      showError(t("invalidEmail"));
      return;
    }
  }

  if (step === 4) {
    const password = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmPassword").value;

    if (password.length < 8) {
      showError(t("shortPassword"));
      return;
    }

    if (password !== confirm) {
      showError(t("mismatch"));
      return;
    }

    state.password = password;
  }

  if (step === 5) {
    setBusy(true);

    try {
      const result = await registerCustomer({
        firstName: state.firstName,
        middleName: state.middleName,
        lastName: state.lastName,
        phone: state.phone,
        email: state.email,
        password: state.password
      });

      if (result.session) {
        renderAccount();
      } else {
        renderVerificationSent();
      }
    } catch (error) {
      showError(error.message || t("signupError"));
    } finally {
      setBusy(false);
    }

    return;
  }

  state.signupStep++;
  waveTo(() => renderSignup());
}

/* EMAIL VERIFICATION */

function renderVerificationSent() {
  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          ${logo()}
          <h1 class="page-title">${t("verify")}</h1>
          <p class="page-description">${t("verifyText")}</p>
          <p>${escapeHTML(state.email)}</p>
        </div>

        <button class="btn btn-primary full-button" id="goLogin">
          ${t("login")}
        </button>
      </div>
    </section>
  `;

  document.getElementById("goLogin").onclick = () => {
    waveTo(renderLogin);
  };
}

/* CUSTOMER ACCOUNT */

function renderAccount() {
  app.innerHTML = `
    <section class="page">
      <div class="panel">
        <div class="brand-area">
          ${logo()}
          <h1 class="page-title">${t("account")}</h1>
          <p class="page-description">${t("signedIn")}</p>
          <p class="page-description">${t("marketplaceSoon")}</p>
        </div>

        <button class="btn btn-primary full-button" id="logoutBtn">
          ${t("logout")}
        </button>
      </div>
    </section>
  `;

  document.getElementById("logoutBtn").onclick = async () => {
    if (state.busy) return;

    setBusy(true);

    try {
      await logoutCustomer();
      waveTo(renderWelcome);
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(false);
    }
  };
}

/* START APPLICATION */

async function startApp() {
  if (!state.language) {
    renderLanguage();
    return;
  }

  try {
    const session = await getCustomerSession();

    if (session) {
      renderAccount();
    } else {
      renderWelcome();
    }
  } catch (error) {
    renderWelcome();
  }
}

startApp();
