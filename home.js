
/* =========================================
   ZUNE MARKETPLACE 2.0
   MARKETPLACE HOME
   SUPABASE + VANILLA JAVASCRIPT
========================================= */

import { supabase } from "./supabase.js";

const PAGE_SIZE = 12;

const homeState = {
  products: [],
  categories: [],
  selectedCategory: "",
  search: "",
  page: 0,
  loading: false,
  hasMore: true,
  activeTab: "home",
  saved: JSON.parse(localStorage.getItem("zune_saved_products") || "[]"),
  user: null,
  app: null,
  onLogout: null,
  observer: null
};

const homeText = {
  sw: {
    search: "Tafuta bidhaa...",
    categories: "Makundi ya bidhaa",
    all: "Zote",
    featured: "Bidhaa maalum",
    latest: "Bidhaa mpya",
    empty: "Bado hakuna bidhaa zilizowekwa.",
    emptySearch: "Hakuna bidhaa zilizopatikana.",
    loading: "Inapakia bidhaa...",
    retry: "Jaribu tena",
    home: "Nyumbani",
    explore: "Gundua",
    ai: "ZUNE AI",
    saved: "Zilizohifadhiwa",
    me: "Akaunti",
    savedEmpty: "Bado hujahifadhi bidhaa.",
    price: "Bei",
    seller: "Muuzaji",
    account: "Akaunti yangu",
    logout: "Toka kwenye akaunti",
    welcome: "Karibu ZUNE",
    noCategories: "Makundi yataonekana hapa",
    loadError: "Imeshindikana kupakia bidhaa.",
    end: "Umefika mwisho wa bidhaa.",
    aiTitle: "ZUNE AI",
    aiText: "Msaidizi wako wa ununuzi atapatikana hapa hivi karibuni.",
    exploreTitle: "Gundua bidhaa",
    savedTitle: "Bidhaa ulizohifadhi",
    homeTitle: "Karibu sokoni",
    searchButton: "Tafuta"
  },

  en: {
    search: "Search products...",
    categories: "Product categories",
    all: "All",
    featured: "Featured products",
    latest: "Latest products",
    empty: "No products have been listed yet.",
    emptySearch: "No products found.",
    loading: "Loading products...",
    retry: "Try again",
    home: "Home",
    explore: "Explore",
    ai: "ZUNE AI",
    saved: "Saved",
    me: "Account",
    savedEmpty: "You have not saved any products yet.",
    price: "Price",
    seller: "Seller",
    account: "My account",
    logout: "Log out",
    welcome: "Welcome to ZUNE",
    noCategories: "Categories will appear here",
    loadError: "Unable to load products.",
    end: "You have reached the end.",
    aiTitle: "ZUNE AI",
    aiText: "Your shopping assistant will be available here soon.",
    exploreTitle: "Explore products",
    savedTitle: "Your saved products",
    homeTitle: "Welcome to the marketplace",
    searchButton: "Search"
  }
};

function language() {
  return localStorage.getItem("zune_language") === "en" ? "en" : "sw";
}

function tx(key) {
  return homeText[language()][key] || key;
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function money(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat(
    language() === "sw" ? "sw-TZ" : "en-TZ"
  ).format(amount) + " TSh";
}

/* HOME STYLES */

function addHomeStyles() {
  if (document.getElementById("zuneHomeStyles")) return;

  const style = document.createElement("style");
  style.id = "zuneHomeStyles";

  style.textContent = `
    .z-home {
      min-height: 100vh;
      background: var(--background);
      color: var(--text);
      padding-bottom: 92px;
    }

    .z-home-header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 16px;
      position: sticky;
      top: 0;
      z-index: 20;
    }

    .z-home-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .z-home-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      font-weight: 800;
    }

    .z-home-brand .zune-logo {
      font-size: 25px;
    }

    .z-home-actions {
      display: flex;
      gap: 8px;
    }

    .z-icon-button {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: 1px solid var(--border);
      background: var(--background);
      color: var(--text);
      font-size: 19px;
      cursor: pointer;
    }

    .z-search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 0 13px;
      height: 48px;
    }

    .z-search-box input {
      width: 100%;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      color: var(--text);
      font-size: 14px;
    }

    .z-home-content {
      max-width: 1100px;
      margin: auto;
      padding: 20px 15px;
    }

    .z-home-welcome {
      background: var(--primary);
      color: white;
      border-radius: 18px;
      padding: 22px 18px;
      margin-bottom: 25px;
    }

    .z-home-welcome h2 {
      margin: 0 0 8px;
      font-size: 21px;
    }

    .z-home-welcome p {
      margin: 0;
      opacity: .9;
      line-height: 1.5;
      font-size: 14px;
    }

    .z-section-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 23px 0 13px;
      gap: 10px;
    }

    .z-section-heading h2 {
      font-size: 17px;
      margin: 0;
    }

    .z-category-list {
      display: flex;
      overflow-x: auto;
      gap: 9px;
      padding: 3px 0 12px;
      scrollbar-width: none;
    }

    .z-category-list::-webkit-scrollbar {
      display: none;
    }

    .z-category {
      flex: 0 0 auto;
      padding: 10px 16px;
      border-radius: 25px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .z-category.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .z-product-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 13px;
    }

    .z-product-card {
      min-width: 0;
      overflow: hidden;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 15px;
      position: relative;
    }

    .z-product-image {
      width: 100%;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      display: block;
      background: var(--background);
    }

    .z-product-placeholder {
      width: 100%;
      aspect-ratio: 1 / 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--background);
      font-size: 42px;
    }

    .z-product-info {
      padding: 11px;
    }

    .z-product-name {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.4;
      margin: 0 0 8px;
      min-height: 36px;
      overflow-wrap: anywhere;
    }

    .z-product-price {
      font-size: 14px;
      font-weight: 800;
      color: var(--primary);
      margin: 0;
    }

    .z-product-category {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 6px;
    }

    .z-save-product {
      position: absolute;
      top: 9px;
      right: 9px;
      border: none;
      background: var(--surface);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      font-size: 18px;
      cursor: pointer;
      box-shadow: var(--shadow);
    }

    .z-empty-state {
      padding: 35px 15px;
      text-align: center;
      color: var(--text-muted);
      background: var(--surface);
      border: 1px dashed var(--border);
      border-radius: 15px;
      line-height: 1.6;
    }

    .z-empty-icon {
      display: block;
      font-size: 38px;
      margin-bottom: 12px;
    }

    .z-load-status {
      text-align: center;
      padding: 20px 10px;
      color: var(--text-muted);
      font-size: 13px;
    }

    .z-bottom-nav {
      position: fixed;
      z-index: 30;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      background: var(--surface);
      border-top: 1px solid var(--border);
      padding: 9px 4px calc(9px + env(safe-area-inset-bottom));
    }

    .z-nav-item {
      border: none;
      background: transparent;
      color: var(--text-muted);
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      cursor: pointer;
    }

    .z-nav-item span:first-child {
      font-size: 20px;
    }

    .z-nav-item.active {
      color: var(--primary);
      font-weight: 800;
    }

    .z-nav-ai span:first-child {
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      margin-top: -17px;
      border: 3px solid var(--surface);
    }

    .z-page-title {
      font-size: 21px;
      margin: 4px 0 17px;
    }

    .z-account-card {
      padding: 22px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: var(--surface);
      text-align: center;
    }

    .z-account-card .zune-logo {
      margin-bottom: 18px;
    }

    .z-account-email {
      color: var(--text-muted);
      overflow-wrap: anywhere;
      margin: 15px 0;
    }

    .z-logout-button {
      width: 100%;
      padding: 14px;
      margin-top: 15px;
      border: none;
      border-radius: 12px;
      background: var(--primary);
      color: white;
      font-weight: 800;
      cursor: pointer;
    }

    @media (min-width: 700px) {
      .z-product-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .z-home-content {
        padding: 25px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .z-home * {
        scroll-behavior: auto !important;
        transition: none !important;
      }
    }
  `;

  document.head.appendChild(style);
}

/* LOGO */

function homeLogo() {
  return `
    <div class="zune-logo">
      <span class="z-letter">Ⓩ</span>
      <span class="u-letter">Ⓤ</span>
      <span class="n-letter">Ⓝ</span>
      <span class="e-letter">Ⓔ</span>
    </div>
  `;
}

/* PRODUCT DATA */

async function loadCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,image_url")
    .in("status", ["active", "approved"])
    .order("display_order", { ascending: true })
    .limit(30);

  if (error) throw error;

  homeState.categories = data || [];
}

async function loadProducts(reset = false) {
  if (homeState.loading) return;

  if (reset) {
    homeState.page = 0;
    homeState.products = [];
    homeState.hasMore = true;
  }

  if (!homeState.hasMore) return;

  homeState.loading = true;
  updateProductArea();

  try {
    let query = supabase
      .from("products")
      .select(`
        id,
        title,
        description,
        price,
        image_url,
        image_urls,
        category,
        category_id,
        is_featured,
        is_deal,
        discount_percent,
        created_at
      `)
      .order("created_at", { ascending: false })
      .range(
        homeState.page * PAGE_SIZE,
        homeState.page * PAGE_SIZE + PAGE_SIZE - 1
      );

    if (homeState.selectedCategory) {
      query = query.eq("category_id", homeState.selectedCategory);
    }

    if (homeState.search.trim()) {
      query = query.ilike("title", `%${homeState.search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    const newProducts = data || [];

    const existingIds = new Set(
      homeState.products.map(product => product.id)
    );

    const uniqueProducts = newProducts.filter(
      product => !existingIds.has(product.id)
    );

    homeState.products.push(...uniqueProducts);

    homeState.hasMore = newProducts.length === PAGE_SIZE;
    homeState.page++;

    updateProductArea();

  } catch (error) {
    console.error("ZUNE product loading error:", error);
    showLoadError();

  } finally {
    homeState.loading = false;
    updateLoadStatus();
  }
}

/* PRODUCT CARD */

function productCard(product) {
  const saved = homeState.saved.includes(product.id);

  const image =
    product.image_url ||
    (Array.isArray(product.image_urls) ? product.image_urls[0] : "");

  return `
    <article class="z-product-card">
      ${
        image
          ? `<img
              class="z-product-image"
              src="${safe(image)}"
              alt="${safe(product.title)}"
              loading="lazy"
            >`
          : `<div class="z-product-placeholder">🛍️</div>`
      }

      <button
        class="z-save-product"
        data-save-product="${safe(product.id)}"
        aria-label="Save product"
      >
        ${saved ? "❤️" : "♡"}
      </button>

      <div class="z-product-info">
        <h3 class="z-product-name">
          ${safe(product.title)}
        </h3>

        <p class="z-product-price">
          ${money(product.price)}
        </p>

        <p class="z-product-category">
          ${safe(product.category || "")}
        </p>
      </div>
    </article>
  `;
}

/* PRODUCT AREA */

function updateProductArea() {
  const grid = document.getElementById("zProductGrid");

  if (!grid) return;

  if (homeState.products.length === 0 && !homeState.loading) {
    grid.innerHTML = `
      <div class="z-empty-state" style="grid-column:1/-1">
        <span class="z-empty-icon">🛍️</span>
        ${
          homeState.search || homeState.selectedCategory
            ? tx("emptySearch")
            : tx("empty")
        }
      </div>
    `;
  } else {
    grid.innerHTML = homeState.products
      .map(productCard)
      .join("");
  }

  grid.querySelectorAll("[data-save-product]").forEach(button => {
    button.onclick = () => {
      toggleSaved(button.dataset.saveProduct);
    };
  });
}

function updateLoadStatus() {
  const status = document.getElementById("zLoadStatus");

  if (!status) return;

  if (homeState.loading) {
    status.textContent = tx("loading");
  } else if (!homeState.hasMore && homeState.products.length > 0) {
    status.textContent = tx("end");
  } else {
    status.textContent = "";
  }
}

function showLoadError() {
  const status = document.getElementById("zLoadStatus");

  if (!status) return;

  status.innerHTML = `
    ${safe(tx("loadError"))}
    <button id="zRetryProducts" class="text-button">
      ${safe(tx("retry"))}
    </button>
  `;

  document.getElementById("zRetryProducts").onclick = () => {
    loadProducts();
  };
}

/* SAVE PRODUCTS */

function toggleSaved(productId) {
  if (homeState.saved.includes(productId)) {
    homeState.saved = homeState.saved.filter(id => id !== productId);
  } else {
    homeState.saved.push(productId);
  }

  localStorage.setItem(
    "zune_saved_products",
    JSON.stringify(homeState.saved)
  );

  if (homeState.activeTab === "saved") {
    renderSavedPage();
  } else {
    updateProductArea();
  }
}

/* CATEGORIES */

function renderCategories() {
  const container = document.getElementById("zCategoryList");

  if (!container) return;

  const allButton = `
    <button
      class="z-category ${!homeState.selectedCategory ? "active" : ""}"
      data-category=""
    >
      ${safe(tx("all"))}
    </button>
  `;

  const buttons = homeState.categories.map(category => `
    <button
      class="z-category ${
        homeState.selectedCategory === category.id ? "active" : ""
      }"
      data-category="${safe(category.id)}"
    >
      ${safe(category.name)}
    </button>
  `).join("");

  container.innerHTML = allButton + buttons;

  container.querySelectorAll("[data-category]").forEach(button => {
    button.onclick = () => {
      homeState.selectedCategory = button.dataset.category;

      renderCategories();
      loadProducts(true);
    };
  });
}

/* HOME CONTENT */

function renderHomePage() {
  homeState.activeTab = "home";

  const metadata = homeState.user?.user_metadata || {};
  const name = metadata.first_name || "";

  homeState.app.innerHTML = `
    <div class="z-home">
      <header class="z-home-header">
        <div class="z-home-top">
          <div class="z-home-brand">
            ${homeLogo()}
          </div>

          <div class="z-home-actions">
            <button class="z-icon-button" id="zSavedShortcut">♡</button>
            <button class="z-icon-button" id="zAccountShortcut">👤</button>
          </div>
        </div>

        <div class="z-search-box">
          <span>⌕</span>
          <input
            id="zProductSearch"
            type="search"
            placeholder="${safe(tx("search"))}"
          >
        </div>
      </header>

      <main class="z-home-content">
        <section class="z-home-welcome">
          <h2>
            ${safe(name ? `Habari, ${name}!` : tx("welcome"))}
          </h2>
          <p>${safe(tx("homeTitle"))}</p>
        </section>

        <div class="z-section-heading">
          <h2>${safe(tx("categories"))}</h2>
        </div>

        <div class="z-category-list" id="zCategoryList">
          <button class="z-category active">${safe(tx("all"))}</button>
        </div>

        <div class="z-section-heading">
          <h2>${safe(tx("latest"))}</h2>
        </div>

        <div class="z-product-grid" id="zProductGrid"></div>

        <div class="z-load-status" id="zLoadStatus"></div>

        <div id="zScrollSentinel" style="height:2px"></div>
      </main>

      ${renderBottomNavigation()}
    </div>
  `;

  document.getElementById("zSavedShortcut").onclick = renderSavedPage;
  document.getElementById("zAccountShortcut").onclick = renderAccountPage;

  const search = document.getElementById("zProductSearch");

  let searchTimer;

  search.oninput = () => {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
      homeState.search = search.value.trim();
      loadProducts(true);
    }, 400);
  };

  renderCategories();
  updateProductArea();
  observeInfiniteScroll();
  loadProducts(true);
}

/* BOTTOM NAVIGATION */

function renderBottomNavigation() {
  const items = [
    ["home", "⌂", tx("home")],
    ["explore", "⌕", tx("explore")],
    ["ai", "✦", tx("ai")],
    ["saved", "♡", tx("saved")],
    ["me", "♙", tx("me")]
  ];

  return `
    <nav class="z-bottom-nav">
      ${items.map(([id, icon, label]) => `
        <button
          class="z-nav-item ${id === "ai" ? "z-nav-ai" : ""} ${
            homeState.activeTab === id ? "active" : ""
          }"
          data-nav="${id}"
        >
          <span>${icon}</span>
          <span>${safe(label)}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

/* NAVIGATION EVENTS */

function bindNavigation() {
  document.querySelectorAll("[data-nav]").forEach(button => {
    button.onclick = () => {
      const page = button.dataset.nav;

      if (page === "home") renderHomePage();
      if (page === "explore") renderExplorePage();
      if (page === "ai") renderAIPage();
      if (page === "saved") renderSavedPage();
      if (page === "me") renderAccountPage();
    };
  });
}

/* INFINITE SCROLL */

function observeInfiniteScroll() {
  if (homeState.observer) {
    homeState.observer.disconnect();
  }

  const sentinel = document.getElementById("zScrollSentinel");

  if (!sentinel || !("IntersectionObserver" in window)) return;

  homeState.observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      loadProducts();
    }
  }, {
    rootMargin: "400px"
  });

  homeState.observer.observe(sentinel);
}

/* EXPLORE PAGE */

function renderExplorePage() {
  homeState.activeTab = "explore";

  homeState.app.innerHTML = `
    <div class="z-home">
      <header class="z-home-header">
        <div class="z-home-brand">
          ${homeLogo()}
        </div>
      </header>

      <main class="z-home-content">
        <h2 class="z-page-title">${safe(tx("exploreTitle"))}</h2>

        <div class="z-search-box">
          <span>⌕</span>
          <input
            id="zExploreSearch"
            type="search"
            placeholder="${safe(tx("search"))}"
            value="${safe(homeState.search)}"
          >
        </div>

        <div class="z-section-heading">
          <h2>${safe(tx("categories"))}</h2>
        </div>

        <div class="z-category-list" id="zCategoryList"></div>

        <div class="z-product-grid" id="zProductGrid"></div>

        <div class="z-load-status" id="zLoadStatus"></div>

        <div id="zScrollSentinel" style="height:2px"></div>
      </main>

      ${renderBottomNavigation()}
    </div>
  `;

  const search = document.getElementById("zExploreSearch");

  let searchTimer;

  search.oninput = () => {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
      homeState.search = search.value.trim();
      loadProducts(true);
    }, 400);
  };

  renderCategories();
  updateProductArea();
  observeInfiniteScroll();
  loadProducts(true);
  bindNavigation();
}

/* SAVED PRODUCTS PAGE */

function renderSavedPage() {
  homeState.activeTab = "saved";

  const savedProducts = homeState.products.filter(product =>
    homeState.saved.includes(product.id)
  );

  homeState.app.innerHTML = `
    <div class="z-home">
      <header class="z-home-header">
        <div class="z-home-brand">
          ${homeLogo()}
        </div>
      </header>

      <main class="z-home-content">
        <h2 class="z-page-title">${safe(tx("savedTitle"))}</h2>

        <div class="z-product-grid" id="zSavedGrid">
          ${
            savedProducts.length
              ? savedProducts.map(productCard).join("")
              : `
                <div class="z-empty-state" style="grid-column:1/-1">
                  <span class="z-empty-icon">♡</span>
                  ${safe(tx("savedEmpty"))}
                </div>
              `
          }
        </div>
      </main>

      ${renderBottomNavigation()}
    </div>
  `;

  document.querySelectorAll("[data-save-product]").forEach(button => {
    button.onclick = () => {
      toggleSaved(button.dataset.saveProduct);
    };
  });

  bindNavigation();
}

/* ZUNE AI PAGE */

function renderAIPage() {
  homeState.activeTab = "ai";

  homeState.app.innerHTML = `
    <div class="z-home">
      <header class="z-home-header">
        <div class="z-home-brand">
          ${homeLogo()}
        </div>
      </header>

      <main class="z-home-content">
        <div class="z-account-card">
          <div style="font-size:48px;margin-bottom:12px">✦</div>

          <h2 class="z-page-title">${safe(tx("aiTitle"))}</h2>

          <p>${safe(tx("aiText"))}</p>
        </div>
      </main>

      ${renderBottomNavigation()}
    </div>
  `;

  bindNavigation();
}

/* ACCOUNT PAGE */

function renderAccountPage() {
  homeState.activeTab = "me";

  const email = homeState.user?.email || "";
  const metadata = homeState.user?.user_metadata || {};
  const name = metadata.first_name || metadata.full_name || tx("account");

  homeState.app.innerHTML = `
    <div class="z-home">
      <header class="z-home-header">
        <div class="z-home-brand">
          ${homeLogo()}
        </div>
      </header>

      <main class="z-home-content">
        <h2 class="z-page-title">${safe(tx("account"))}</h2>

        <div class="z-account-card">
          <div style="font-size:48px">👤</div>

          <h2>${safe(name)}</h2>

          <p class="z-account-email">
            ${safe(email)}
          </p>

          <button class="z-logout-button" id="zLogoutButton">
            ${safe(tx("logout"))}
          </button>
        </div>
      </main>

      ${renderBottomNavigation()}
    </div>
  `;

  document.getElementById("zLogoutButton").onclick = async () => {
    const button = document.getElementById("zLogoutButton");

    button.disabled = true;
    button.textContent = "...";

    try {
      if (typeof homeState.onLogout === "function") {
        await homeState.onLogout();
      } else {
        const { error } = await supabase.auth.signOut();

        if (error) throw error;

        window.location.reload();
      }
    } catch (error) {
      console.error("ZUNE logout error:", error);

      button.disabled = false;
      button.textContent = tx("logout");

      alert(
        language() === "sw"
          ? "Imeshindikana kutoka kwenye akaunti."
          : "Unable to log out."
      );
    }
  };

  bindNavigation();
}

/* MAIN MARKETPLACE ENTRY */

export async function renderMarketplaceHome({
  app,
  user,
  onLogout
}) {
  if (!app) {
    console.error("ZUNE: Marketplace app container is missing.");
    return;
  }

  homeState.app = app;
  homeState.user = user || null;
  homeState.onLogout = onLogout || null;

  addHomeStyles();

  try {
    await loadCategories();
  } catch (error) {
    console.error("ZUNE category loading error:", error);
    homeState.categories = [];
  }

  renderHomePage();
  bindNavigation();
}
