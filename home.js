// ============================================
// ZUNE MARKETPLACE 2.0
// HOME.JS — SEHEMU YA 1/4
// ============================================

import { supabase } from "./supabase.js";

// --------------------------------------------
// 1. SETTINGS AND STATE
// --------------------------------------------

const PAGE_SIZE = 12;

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn("ZUNE storage error:", key, error);
    return fallback;
  }
}

const homeState = {
  products: [],
  categories: [],

  selectedCategory: "",
  search: "",

  page: 0,
  loading: false,
  loadError: false,
  hasMore: true,

  activeTab: "home",

  saved: readStorage("zune_saved_products", []),
  cart: readStorage("zune_cart", []),

  user: null,
  app: null,
  onLogout: null,
  accountProfile: null,
  sellerApplication: null,
  accountLoading: false,
  accountLoadedFor: null,
  accountError: "",

  observer: null,
  requestId: 0
};

// --------------------------------------------
// 2. LANGUAGE TRANSLATIONS
// --------------------------------------------

const homeText = {
  sw: {
    search: "Tafuta bidhaa...",
    categories: "Makundi ya bidhaa",
    all: "Zote",
    latest: "Bidhaa mpya",

    empty: "Bado hakuna bidhaa zilizowekwa.",
    emptySearch: "Hakuna bidhaa zilizopatikana.",

    loading: "Inapakia bidhaa...",
    retry: "Jaribu tena",
    loadError: "Imeshindikana kupakia bidhaa.",
    end: "Umefika mwisho wa bidhaa.",

    home: "Nyumbani",
    explore: "Gundua",
    cart: "Kikapu",
    saved: "Zilizohifadhiwa",
    me: "Akaunti",

    savedEmpty: "Bado hujahifadhi bidhaa.",
    cartEmpty: "Kikapu chako bado hakina bidhaa.",

    price: "Bei",
    seller: "Muuzaji",
    account: "Akaunti yangu",
    logout: "Toka kwenye akaunti",

    welcome: "Karibu ZUNE",
    homeTitle: "Gundua bidhaa bora kutoka kwa wauzaji mbalimbali.",
    exploreTitle: "Gundua bidhaa",
    savedTitle: "Bidhaa ulizohifadhi",
    cartTitle: "Kikapu chako",

    addCart: "Weka kikapuni",
    added: "Imeongezwa kikapuni",
    remove: "Ondoa",
    total: "Jumla",
    continueShopping: "Endelea kununua",

    quantity: "Idadi",
    cartCount: "Bidhaa",
    emptyName: "Bidhaa",

    orderSummary: "Muhtasari wa oda",
    subtotal: "Jumla ndogo",
    checkout: "Endelea kulipia",
    checkoutNote: "Malipo yatapatikana baada ya kuunganishwa kwa mfumo wa malipo.",
    checkoutComingSoon: "Mfumo wa malipo utaunganishwa baadaye.",

    yourCollection: "Mkusanyiko wako",
    yourProfile: "Wasifu wako",
    noSaved: "Hakuna bidhaa zilizohifadhiwa",
    noSavedText: "Hifadhi bidhaa unazozipenda ili uzipate kwa urahisi.",
    exploreProducts: "Gundua bidhaa",

    yourCart: "Ununuzi wako",
    emptyCart: "Kikapu kiko tupu",
    emptyCartText: "Ongeza bidhaa unazotaka kununua."
  },

  en: {
    search: "Search products...",
    categories: "Product categories",
    all: "All",
    latest: "Latest products",

    empty: "No products have been listed yet.",
    emptySearch: "No products found.",

    loading: "Loading products...",
    retry: "Try again",
    loadError: "Unable to load products.",
    end: "You have reached the end.",

    home: "Home",
    explore: "Explore",
    cart: "Cart",
    saved: "Saved",
    me: "Account",

    savedEmpty: "You have not saved any products yet.",
    cartEmpty: "Your cart is empty.",

    price: "Price",
    seller: "Seller",
    account: "My account",
    logout: "Log out",

    welcome: "Welcome to ZUNE",
    homeTitle: "Discover great products from different sellers.",
    exploreTitle: "Explore products",
    savedTitle: "Your saved products",
    cartTitle: "Your shopping cart",

    addCart: "Add to cart",
    added: "Added to cart",
    remove: "Remove",
    total: "Total",
    continueShopping: "Continue shopping",

    quantity: "Quantity",
    cartCount: "Items",
    emptyName: "Product",

    orderSummary: "Order summary",
    subtotal: "Subtotal",
    checkout: "Continue to checkout",
    checkoutNote: "Payments will be available after payment integration.",
    checkoutComingSoon: "Payment system will be connected later.",

    yourCollection: "Your collection",
    yourProfile: "Your profile",
    noSaved: "No saved products",
    noSavedText: "Save products you like to find them easily.",
    exploreProducts: "Explore products",

    yourCart: "Your shopping",
    emptyCart: "Your cart is empty",
    emptyCartText: "Add products you want to buy."
  }
};

// --------------------------------------------
// 3. LANGUAGE AND TEXT HELPERS
// --------------------------------------------

function language() {
  return localStorage.getItem("zune_language") === "en"
    ? "en"
    : "sw";
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

// --------------------------------------------
// 4. CART STORAGE HELPERS
// --------------------------------------------

function getCartCount() {
  return homeState.cart.reduce(
    (total, item) =>
      total + Math.max(0, Number(item.quantity) || 0),
    0
  );
}

function saveCart() {
  localStorage.setItem(
    "zune_cart",
    JSON.stringify(homeState.cart)
  );

  updateCartBadges();
}

function updateCartBadges() {
  document.querySelectorAll("[data-cart-count]").forEach(badge => {
    const count = getCartCount();

    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
  });
}

// --------------------------------------------
// 5. ICON SYSTEM
// --------------------------------------------

function zIcon(name) {
  const icons = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',

    explore: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5M14 8l-2 5-5 2 2-5z"/>',

    cart: '<path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 1.9-1.5L22 8H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/>',

    saved: '<path d="M20.8 8.6c0 5.1-8.8 11-8.8 11s-8.8-5.9-8.8-11a4.8 4.8 0 0 1 8.8-2.5 4.8 4.8 0 0 1 8.8 2.5z"/>',

    account: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',

    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',

    plus: '<path d="M12 5v14M5 12h14"/>',

    minus: '<path d="M5 12h14"/>',

    trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7"/>'
  };

  return `
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      ${icons[name] || icons.home}
    </svg>
  `;
}

// --------------------------------------------
// 6. LUXURY EMERALD STYLES
// --------------------------------------------

function addHomeStyles() {
  if (document.getElementById("zuneHomeStyles")) return;

  const style = document.createElement("style");
  style.id = "zuneHomeStyles";

  style.textContent = `

    .z-home,
    .z-marketplace {
      min-height: 100vh;
      background: var(--background, #f5f7f6);
      color: var(--text, #17231e);
      font-family: inherit;
    }

    .z-home {
      padding-bottom: 100px;
    }

    .z-home-header {
      position: sticky;
      top: 0;
      z-index: 20;
      background: var(--surface, #ffffff);
      border-bottom: 1px solid var(--border, #e4ebe7);
      padding: 15px 16px;
    }

    .z-home-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 15px;
    }

    .z-home-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      font-weight: 800;
    }

    .zune-logo {
      display: flex;
      align-items: center;
      gap: 2px;
      color: var(--primary, #087a55);
      font-size: 25px;
      font-weight: 900;
    }

    .z-home-actions {
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .z-icon-button {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      border: 1px solid var(--border, #e4ebe7);
      background: var(--background, #f5f7f6);
      color: var(--text, #17231e);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .z-search-box {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 49px;
      padding: 0 13px;
      background: var(--background, #f5f7f6);
      border: 1px solid var(--border, #e4ebe7);
      border-radius: 15px;
    }

    .z-search-box input {
      width: 100%;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      color: var(--text, #17231e);
      font-size: 14px;
    }

    .z-home-content {
      max-width: 1100px;
      margin: auto;
      padding: 19px 15px 25px;
    }

    .z-home-welcome {
      position: relative;
      overflow: hidden;
      background: var(--primary, #087a55);
      color: white;
      border-radius: 21px;
      padding: 23px 19px;
      margin-bottom: 26px;
    }

    .z-welcome-tag {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.1px;
      margin-bottom: 11px;
    }

    .z-home-welcome h2 {
      margin: 0 0 8px;
      font-size: 22px;
      font-weight: 800;
    }

    .z-home-welcome p {
      margin: 0;
      max-width: 290px;
      line-height: 1.55;
      font-size: 13px;
    }

    .z-section-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 23px 0 13px;
    }

    .z-section-heading h2 {
      font-size: 16px;
      font-weight: 800;
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
      border-radius: 13px;
      border: 1px solid var(--border, #e4ebe7);
      background: var(--surface, #ffffff);
      color: var(--text, #17231e);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .z-category.active {
      background: var(--primary, #087a55);
      color: white;
      border-color: var(--primary, #087a55);
    }

    .z-product-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 13px;
    }

    .z-product-card {
      min-width: 0;
      overflow: hidden;
      background: var(--surface, #ffffff);
      border: 1px solid var(--border, #e4ebe7);
      border-radius: 17px;
      position: relative;
      box-shadow: 0 3px 12px rgb(0 0 0 / 3%);
    }

    .z-product-image,
    .z-product-placeholder {
      width: 100%;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--background, #f5f7f6);
    }

    .z-product-placeholder {
      font-size: 40px;
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
      font-weight: 900;
      color: var(--primary, #087a55);
      margin: 0 0 6px;
    }

    .z-product-category {
      font-size: 11px;
      color: var(--text-muted, #71817a);
      margin: 0 0 10px;
    }

    .z-save-product {
      position: absolute;
      top: 9px;
      right: 9px;
      border: 1px solid var(--border, #e4ebe7);
      background: var(--surface, #ffffff);
      color: var(--text, #17231e);
      border-radius: 50%;
      width: 35px;
      height: 35px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      cursor: pointer;
    }

    .z-add-cart,
    .z-primary-button {
      width: 100%;
      min-height: 40px;
      border: none;
      border-radius: 10px;
      background: var(--primary, #087a55);
      color: white;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
    }

    .z-empty-state {
      padding: 35px 15px;
      text-align: center;
      color: var(--text-muted, #71817a);
      background: var(--surface, #ffffff);
      border: 1px dashed var(--border, #e4ebe7);
      border-radius: 16px;
      line-height: 1.6;
    }

    .z-empty-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      font-size: 38px;
    }

    .z-load-status {
      text-align: center;
      padding: 20px 10px;
      color: var(--text-muted, #71817a);
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
      gap: 3px;
      background: var(--surface, #ffffff);
      border-top: 1px solid var(--border, #e4ebe7);
      padding: 9px 7px calc(9px + env(safe-area-inset-bottom));
      box-shadow: 0 -5px 20px rgb(0 0 0 / 4%);
    }

    .z-nav-item {
      position: relative;
      border: none;
      background: transparent;
      color: var(--text-muted, #71817a);
      min-width: 0;
      flex: 1;
      min-height: 57px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
    }

    .z-nav-icon {
      position: relative;
      width: 42px;
      height: 34px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .z-nav-item.active {
      color: var(--primary, #087a55);
      font-weight: 800;
    }

    .z-nav-item.active .z-nav-icon {
      background: var(--primary, #087a55);
      color: white;
    }

    .z-cart-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 17px;
      height: 17px;
      padding: 0 4px;
      border-radius: 20px;
      background: #E87932;
      color: white;
      border: 2px solid var(--surface, #ffffff);
      font-size: 9px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .z-cart-badge[hidden] {
      display: none;
    }

    .z-page-title {
      font-size: 21px;
      font-weight: 800;
      margin: 4px 0 17px;
    }

    .z-account-card,
    .z-cart-summary {
      padding: 20px;
      border-radius: 18px;
      border: 1px solid var(--border, #e4ebe7);
      background: var(--surface, #ffffff);
    }

    .z-account-card {
      text-align: center;
    }

    .z-account-email {
      color: var(--text-muted, #71817a);
      overflow-wrap: anywhere;
    }

    .z-logout-button {
      width: 100%;
      padding: 14px;
      margin-top: 15px;
      border: none;
      border-radius: 12px;
      background: var(--primary, #087a55);
      color: white;
      font-weight: 800;
      cursor: pointer;
    }

    .z-seller-panel { margin-top:18px; padding:18px; border:1px solid var(--border,#e4ebe7); border-radius:17px; background:var(--surface,#fff); }
    .z-seller-panel h2 { margin:0 0 8px; font-size:17px; }
    .z-seller-panel p { color:var(--text-muted,#71817a); line-height:1.5; font-size:13px; }
    .z-seller-status { padding:12px; border-radius:11px; background:var(--background,#f5f7f6); margin:12px 0; }
    .z-seller-status strong { display:block; margin-bottom:5px; }
    .z-seller-form { display:grid; gap:12px; margin-top:14px; }
    .z-seller-form label { display:grid; gap:6px; font-size:12px; font-weight:700; }
    .z-seller-form input,.z-seller-form textarea { width:100%; min-height:44px; box-sizing:border-box; padding:10px 12px; border:1px solid var(--border,#e4ebe7); border-radius:10px; background:var(--background,#f5f7f6); color:var(--text,#17231e); font:inherit; }
    .z-seller-form button:disabled { opacity:.6; cursor:wait; }
    .z-account-message { margin:10px 0; color:var(--text-muted,#71817a); font-size:13px; }

    .z-cart-list {
      display: grid;
      gap: 12px;
    }

    .z-cart-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px;
      background: var(--surface, #ffffff);
      border: 1px solid var(--border, #e4ebe7);
      border-radius: 15px;
    }

    .z-cart-item img,
    .z-cart-item-placeholder {
      width: 76px;
      height: 76px;
      flex-shrink: 0;
      object-fit: cover;
      border-radius: 11px;
      background: var(--background, #f5f7f6);
    }

    .z-cart-item-info {
      flex: 1;
      min-width: 0;
    }

    .z-cart-item-info h3 {
      font-size: 13px;
      margin: 0 0 6px;
      overflow-wrap: anywhere;
    }

    .z-quantity-controls {
      display: flex;
      align-items: center;
      gap: 9px;
      margin-top: 9px;
    }

    .z-quantity-controls button {
      width: 30px;
      height: 30px;
      border: 1px solid var(--border, #e4ebe7);
      border-radius: 8px;
      background: var(--background, #f5f7f6);
      color: var(--text, #17231e);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .z-cart-remove {
      border: none;
      background: transparent;
      color: #D65D52;
      padding: 7px;
      cursor: pointer;
    }

    .z-cart-total {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-weight: 900;
      font-size: 17px;
      margin-bottom: 15px;
    }

    .z-continue-shopping {
      width: 100%;
      border: 1px solid var(--primary, #087a55);
      background: transparent;
      color: var(--primary, #087a55);
      border-radius: 11px;
      padding: 12px;
      margin-top: 13px;
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

      .z-bottom-nav {
        left: 50%;
        right: auto;
        width: min(600px, 96%);
        transform: translateX(-50%);
        bottom: 12px;
        border: 1px solid var(--border, #e4ebe7);
        border-radius: 19px;
        padding-bottom: 9px;
      }

      .z-home {
        padding-bottom: 115px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .z-marketplace *,
      .z-marketplace *::before,
      .z-marketplace *::after {
        scroll-behavior: auto !important;
        transition: none !important;
        animation: none !important;
      }
    }
  `;

  document.head.appendChild(style);
}

// --------------------------------------------
// MWISHO WA SEHEMU YA 1/4
// SEHEMU YA 2/4 ITAENDELEA HAPA CHINI
// --------------------------------------------
// ============================================
// ZUNE MARKETPLACE 2.0
// HOME.JS — SEHEMU YA 2/4
// ============================================

// --------------------------------------------
// 7. LOAD CATEGORIES FROM SUPABASE
// --------------------------------------------

async function loadCategories() {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .in("status", ["active", "approved"])
      .order("display_order", { ascending: true });

    if (error) throw error;

    homeState.categories = data || [];

  } catch (error) {
    console.error("ZUNE categories error:", error);
    homeState.categories = [];
  }
}

// --------------------------------------------
// 8. LOAD PRODUCTS WITH PAGINATION
// --------------------------------------------

async function loadProducts(reset = false) {
  if (homeState.loading) return;

  if (!reset && !homeState.hasMore) return;

  if (reset) {
    homeState.requestId++;
    homeState.products = [];
    homeState.page = 0;
    homeState.hasMore = true;
    homeState.loadError = false;
  }

  const requestId = homeState.requestId;

  homeState.loading = true;
  updateLoadStatus();

  try {
    let query = supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .range(
        homeState.page * PAGE_SIZE,
        (homeState.page + 1) * PAGE_SIZE - 1
      );

    if (homeState.selectedCategory) {
      query = query.eq(
        "category_id",
        homeState.selectedCategory
      );
    }

    if (homeState.search.trim()) {
      const searchValue = homeState.search.trim()
        .replace(/[,%()]/g, " ");

      query = query.ilike(
        "title",
        `%${searchValue}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    if (requestId !== homeState.requestId) return;

    const products = data || [];

    if (reset) {
      homeState.products = products;
    } else {
      const existingIds = new Set(
        homeState.products.map(product => String(product.id))
      );

      const newProducts = products.filter(
        product => !existingIds.has(String(product.id))
      );

      homeState.products.push(...newProducts);
    }

    homeState.page++;
    homeState.hasMore = products.length === PAGE_SIZE;
    homeState.loadError = false;

  } catch (error) {
    if (requestId === homeState.requestId) {
      console.error("ZUNE products error:", error);
      homeState.loadError = true;
    }

  } finally {
    if (requestId === homeState.requestId) {
      homeState.loading = false;
      updateLoadStatus();
      updateProductArea();
    }
  }
}

// --------------------------------------------
// 9. PRODUCT IMAGE
// --------------------------------------------

function productImage(product) {
  const image = product.image_url;

  if (!image) {
    return `
      <div class="z-product-placeholder">
        <span>📦</span>
      </div>
    `;
  }

  return `
    <img
      class="z-product-image"
      src="${safe(image)}"
      alt="${safe(product.title)}"
      loading="lazy"
      onerror="this.style.display='none'"
    >
  `;
}

// --------------------------------------------
// 10. PRODUCT CARD
// --------------------------------------------

function productCard(product) {
  const id = String(product.id);

  const isSaved = homeState.saved
    .map(String)
    .includes(id);

  return `
    <article class="z-product-card">

      <button
        type="button"
        class="z-save-product"
        data-save-product="${safe(id)}"
        aria-label="${isSaved ? "Remove saved product" : "Save product"}"
      >
        ${isSaved ? "♥" : "♡"}
      </button>

      ${productImage(product)}

      <div class="z-product-info">

        <h3 class="z-product-name">
          ${safe(product.title || tx("emptyName"))}
        </h3>

        <p class="z-product-price">
          ${money(product.price)}
        </p>

        <p class="z-product-category">
          ${safe(product.category || "")}
        </p>

        <button
          type="button"
          class="z-add-cart"
          data-add-cart="${safe(id)}"
        >
          ${tx("addCart")}
        </button>

      </div>
    </article>
  `;
}

// --------------------------------------------
// 11. SAVE PRODUCT
// --------------------------------------------

function toggleSaved(productId) {
  const id = String(productId);

  const exists = homeState.saved
    .map(String)
    .includes(id);

  if (exists) {
    homeState.saved = homeState.saved.filter(
      savedId => String(savedId) !== id
    );
  } else {
    homeState.saved.push(id);
  }

  localStorage.setItem(
    "zune_saved_products",
    JSON.stringify(homeState.saved)
  );

  updateProductArea();
}

// --------------------------------------------
// 12. ADD TO CART
// --------------------------------------------

function addToCart(productId) {
  const id = String(productId);

  const product = homeState.products.find(
    item => String(item.id) === id
  );

  if (!product) {
    alert(
      language() === "sw"
        ? "Bidhaa haijapatikana. Jaribu kupakia tena."
        : "Product not found. Please reload and try again."
    );
    return;
  }

  const existing = homeState.cart.find(
    item => String(item.productId) === id
  );

  if (existing) {
    existing.quantity = Math.max(
      1,
      Number(existing.quantity || 1) + 1
    );
  } else {
    homeState.cart.push({
      productId: id,
      quantity: 1
    });
  }

  saveCart();

  alert(tx("added"));
}

// --------------------------------------------
// 13. CHANGE CART QUANTITY
// --------------------------------------------

function changeCartQuantity(productId, change) {
  const id = String(productId);

  const item = homeState.cart.find(
    cartItem => String(cartItem.productId) === id
  );

  if (!item) return;

  item.quantity = Number(item.quantity || 1) + change;

  if (item.quantity <= 0) {
    homeState.cart = homeState.cart.filter(
      cartItem => String(cartItem.productId) !== id
    );
  }

  saveCart();
}

// --------------------------------------------
// 14. REMOVE CART ITEM
// --------------------------------------------

function removeCartItem(productId) {
  const id = String(productId);

  homeState.cart = homeState.cart.filter(
    item => String(item.productId) !== id
  );

  saveCart();
}

// --------------------------------------------
// 15. UPDATE PRODUCT AREA
// --------------------------------------------

function updateProductArea() {
  const area = document.getElementById("z-product-area");

  if (!area) return;

  if (homeState.products.length) {
    area.innerHTML = `
      <div class="z-product-grid">
        ${homeState.products.map(productCard).join("")}
      </div>
    `;
  } else if (!homeState.loading && !homeState.loadError) {
    area.innerHTML = `
      <div class="z-empty-state">
        <div class="z-empty-icon">📦</div>
        <strong>${tx("empty")}</strong>
      </div>
    `;
  }

  area.querySelectorAll("[data-save-product]").forEach(button => {
    button.addEventListener("click", () => {
      toggleSaved(button.dataset.saveProduct);
    });
  });

  area.querySelectorAll("[data-add-cart]").forEach(button => {
    button.addEventListener("click", () => {
      addToCart(button.dataset.addCart);
    });
  });
}

// --------------------------------------------
// 16. LOADING STATUS AND RETRY
// --------------------------------------------

function updateLoadStatus() {
  const status = document.getElementById("z-load-status");

  if (!status) return;

  if (homeState.loading) {
    status.innerHTML = `
      <span>${tx("loading")}</span>
    `;
    return;
  }

  if (homeState.loadError) {
    status.innerHTML = `
      <span>${tx("loadError")}</span>
      <br>
      <button
        type="button"
        class="z-primary-button"
        id="z-retry-products"
        style="max-width:160px;margin:12px auto"
      >
        ${tx("retry")}
      </button>
    `;

    document
      .getElementById("z-retry-products")
      ?.addEventListener("click", () => {
        loadProducts(homeState.products.length === 0);
      });

    return;
  }

  if (!homeState.hasMore && homeState.products.length) {
    status.textContent = tx("end");
  } else {
    status.textContent = "";
  }
}

// --------------------------------------------
// MWISHO WA SEHEMU YA 2/4
// SEHEMU YA 3/4 ITAENDELEA HAPA CHINI
// --------------------------------------------
// ============================================
// ZUNE MARKETPLACE 2.0
// HOME.JS — SEHEMU YA 3/4
// ============================================

// --------------------------------------------
// 17. RENDER CATEGORIES
// --------------------------------------------

function renderCategories() {
  const categories = homeState.categories || [];

  return `
    <div class="z-category-list">

      <button
        type="button"
        class="z-category ${!homeState.selectedCategory ? "active" : ""}"
        data-category=""
      >
        ${tx("all")}
      </button>

      ${categories.map(category => `
        <button
          type="button"
          class="z-category ${
            String(homeState.selectedCategory) === String(category.id)
              ? "active"
              : ""
          }"
          data-category="${safe(category.id)}"
        >
          ${safe(category.name)}
        </button>
      `).join("")}

    </div>
  `;
}

// --------------------------------------------
// 18. HOME PAGE
// --------------------------------------------

function renderHomePage() {
  return `
    <div class="z-home">

      <header class="z-home-header">

        <div class="z-home-top">

          <div class="z-home-brand">
            <div class="zune-logo">ⓏⓊⓃⒺ</div>
          </div>

          <div class="z-home-actions">

            <button
              type="button"
              class="z-icon-button"
              data-open-saved
              aria-label="${tx("saved")}"
            >
              ${zIcon("saved")}
            </button>

            <button
              type="button"
              class="z-icon-button"
              data-open-cart
              aria-label="${tx("cart")}"
            >
              ${zIcon("cart")}
              <span class="z-cart-badge" data-cart-count hidden>0</span>
            </button>

          </div>

        </div>

        <label class="z-search-box">
          ${zIcon("search")}

          <input
            id="z-home-search"
            type="search"
            placeholder="${tx("search")}"
            value="${safe(homeState.search)}"
            autocomplete="off"
          >
        </label>

      </header>

      <main class="z-home-content">

        <section class="z-home-welcome">

          <div class="z-welcome-tag">ⓏⓊⓃⒺ MARKETPLACE</div>

          <h2>${tx("welcome")}</h2>

          <p>${tx("homeTitle")}</p>

        </section>

        <section>

          <div class="z-section-heading">
            <h2>${tx("categories")}</h2>
          </div>

          <div id="z-category-area">
            ${renderCategories()}
          </div>

        </section>

        <section>

          <div class="z-section-heading">
            <h2>${tx("latest")}</h2>
          </div>

          <div id="z-product-area">

            ${
              homeState.products.length
                ? `
                  <div class="z-product-grid">
                    ${homeState.products.map(productCard).join("")}
                  </div>
                `
                : ""
            }

          </div>

          <div
            class="z-load-status"
            id="z-load-status"
          ></div>

          <div id="z-scroll-trigger"></div>

        </section>

      </main>

    </div>
  `;
}

// --------------------------------------------
// 19. CATEGORY EVENTS
// --------------------------------------------

function bindCategoryEvents() {
  const area = document.getElementById("z-category-area");

  if (!area) return;

  area.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", async () => {
      homeState.selectedCategory = button.dataset.category || "";

      homeState.page = 0;
      homeState.products = [];
      homeState.hasMore = true;

      const categories = document.getElementById("z-category-area");

      if (categories) {
        categories.innerHTML = renderCategories();
        bindCategoryEvents();
      }

      await loadProducts(true);
    });
  });
}

// --------------------------------------------
// 20. SEARCH EVENTS
// --------------------------------------------

function bindSearchEvents() {
  const input = document.getElementById("z-home-search");

  if (!input) return;

  let searchTimeout;

  input.addEventListener("input", () => {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
      homeState.search = input.value.trim();

      homeState.products = [];
      homeState.page = 0;
      homeState.hasMore = true;

      await loadProducts(true);

    }, 450);
  });
}

// --------------------------------------------
// 21. HOME EVENTS
// --------------------------------------------

function bindHomeEvents() {
  bindCategoryEvents();
  bindSearchEvents();

  document.querySelector("[data-open-saved]")
    ?.addEventListener("click", () => {
      renderMarketplacePage("saved");
    });

  document.querySelector("[data-open-cart]")
    ?.addEventListener("click", () => {
      renderMarketplacePage("cart");
    });

  updateProductArea();
  updateLoadStatus();
}

// --------------------------------------------
// 22. BOTTOM NAVIGATION
// --------------------------------------------

function renderBottomNavigation() {
  const items = [
    {
      id: "home",
      label: tx("home"),
      icon: "home"
    },
    {
      id: "explore",
      label: tx("explore"),
      icon: "explore"
    },
    {
      id: "cart",
      label: tx("cart"),
      icon: "cart"
    },
    {
      id: "saved",
      label: tx("saved"),
      icon: "saved"
    },
    {
      id: "me",
      label: tx("me"),
      icon: "account"
    }
  ];

  return `
    <nav class="z-bottom-nav" aria-label="Main navigation">

      ${items.map(item => `
        <button
          type="button"
          class="z-nav-item ${
            homeState.activeTab === item.id ? "active" : ""
          }"
          data-nav="${item.id}"
        >

          <span class="z-nav-icon">

            ${zIcon(item.icon)}

            ${
              item.id === "cart"
                ? `<span class="z-cart-badge" data-cart-count hidden>0</span>`
                : ""
            }

          </span>

          <span>${item.label}</span>

        </button>
      `).join("")}

    </nav>
  `;
}

// --------------------------------------------
// 23. NAVIGATION EVENTS
// --------------------------------------------

function bindNavigation() {
  document.querySelectorAll("[data-nav]").forEach(button => {
    button.addEventListener("click", () => {
      const page = button.dataset.nav;

      renderMarketplacePage(page);
    });
  });
}

// --------------------------------------------
// 24. INFINITE SCROLL
// --------------------------------------------

function observeInfiniteScroll() {
  if (homeState.observer) {
    homeState.observer.disconnect();
    homeState.observer = null;
  }

  const trigger = document.getElementById("z-scroll-trigger");

  if (!trigger || !("IntersectionObserver" in window)) {
    return;
  }

  homeState.observer = new IntersectionObserver(entries => {
    const entry = entries[0];

    if (
      entry.isIntersecting &&
      !homeState.loading &&
      homeState.hasMore &&
      !homeState.loadError
    ) {
      loadProducts(false);
    }

  }, {
    root: null,
    rootMargin: "350px",
    threshold: 0
  });

  homeState.observer.observe(trigger);
}

// --------------------------------------------
// 25. EXPLORE PAGE
// --------------------------------------------

function renderExplorePage() {
  return `
    <section class="z-home">

      <header class="z-home-header">

        <div class="z-home-top">
          <div class="zune-logo">ⓏⓊⓃⒺ</div>
        </div>

        <label class="z-search-box">

          ${zIcon("search")}

          <input
            id="z-explore-search"
            type="search"
            placeholder="${tx("search")}"
            value="${safe(homeState.search)}"
          >

        </label>

      </header>

      <main class="z-home-content">

        <h1 class="z-page-title">
          ${tx("exploreTitle")}
        </h1>

        <div id="z-product-area">

          ${
            homeState.products.length
              ? `
                <div class="z-product-grid">
                  ${homeState.products.map(productCard).join("")}
                </div>
              `
              : ""
          }

        </div>

        <div
          class="z-load-status"
          id="z-load-status"
        ></div>

        <div id="z-scroll-trigger"></div>

      </main>

    </section>
  `;
}

// --------------------------------------------
// 26. EXPLORE EVENTS
// --------------------------------------------

function bindExploreEvents() {
  const input = document.getElementById("z-explore-search");

  if (input) {
    let searchTimeout;

    input.addEventListener("input", () => {
      clearTimeout(searchTimeout);

      searchTimeout = setTimeout(async () => {
        homeState.search = input.value.trim();

        homeState.selectedCategory = "";
        homeState.products = [];
        homeState.page = 0;
        homeState.hasMore = true;

        await loadProducts(true);

      }, 450);
    });
  }

  updateProductArea();
  updateLoadStatus();
}

// --------------------------------------------
// MWISHO WA SEHEMU YA 3/4
// SEHEMU YA 4/4 ITAENDELEA HAPA CHINI
// --------------------------------------------
// ============================================
// ZUNE MARKETPLACE 2.0
// HOME.JS — SEHEMU YA 4/4
// ============================================

// --------------------------------------------
// 27. CART PAGE
// --------------------------------------------

function renderCartPage() {
  const items = homeState.cart.map(item => {
    const product = homeState.products.find(
      p => String(p.id) === String(item.productId)
    );

    return product ? {
      ...item,
      product
    } : null;

  }).filter(Boolean);

  const total = items.reduce((sum, item) => {
    return sum +
      Number(item.product.price || 0) *
      Number(item.quantity || 1);
  }, 0);

  return `
    <section class="z-home">

      <main class="z-home-content">

        <h1 class="z-page-title">
          ${tx("cartTitle")}
        </h1>

        ${
          items.length
            ? `
              <div class="z-cart-list">

                ${items.map(item => `
                  <article class="z-cart-item">

                    ${productImage(item.product)}

                    <div class="z-cart-item-info">

                      <h3>
                        ${safe(item.product.title)}
                      </h3>

                      <strong class="z-product-price">
                        ${money(item.product.price)}
                      </strong>

                      <div class="z-quantity-controls">

                        <button
                          type="button"
                          data-cart-minus="${safe(item.productId)}"
                        >
                          −
                        </button>

                        <span>${item.quantity}</span>

                        <button
                          type="button"
                          data-cart-plus="${safe(item.productId)}"
                        >
                          +
                        </button>

                      </div>

                    </div>

                    <button
                      type="button"
                      class="z-cart-remove"
                      data-cart-remove="${safe(item.productId)}"
                    >
                      ${tx("remove")}
                    </button>

                  </article>
                `).join("")}

              </div>

              <div class="z-cart-summary" style="margin-top:20px">

                <div class="z-cart-total">

                  <span>${tx("total")}</span>

                  <strong>${money(total)}</strong>

                </div>

                <button
                  type="button"
                  class="z-primary-button"
                  id="z-checkout"
                >
                  ${tx("checkout")}
                </button>

                <p>${tx("checkoutNote")}</p>

                <button
                  type="button"
                  class="z-continue-shopping"
                  data-go-home
                >
                  ${tx("continueShopping")}
                </button>

              </div>
            `
            : `
              <div class="z-empty-state">

                <div class="z-empty-icon">🛒</div>

                <h2>${tx("emptyCart")}</h2>

                <p>${tx("emptyCartText")}</p>

                <button
                  type="button"
                  class="z-primary-button"
                  data-go-home
                >
                  ${tx("continueShopping")}
                </button>

              </div>
            `
        }

      </main>

    </section>
  `;
}

// --------------------------------------------
// 28. CART EVENTS
// --------------------------------------------

function bindCartEvents() {
  document.querySelectorAll("[data-cart-minus]").forEach(button => {
    button.addEventListener("click", () => {
      changeCartQuantity(button.dataset.cartMinus, -1);
      renderMarketplacePage("cart");
    });
  });

  document.querySelectorAll("[data-cart-plus]").forEach(button => {
    button.addEventListener("click", () => {
      changeCartQuantity(button.dataset.cartPlus, 1);
      renderMarketplacePage("cart");
    });
  });

  document.querySelectorAll("[data-cart-remove]").forEach(button => {
    button.addEventListener("click", () => {
      removeCartItem(button.dataset.cartRemove);
      renderMarketplacePage("cart");
    });
  });

  document.querySelectorAll("[data-go-home]").forEach(button => {
    button.addEventListener("click", () => {
      renderMarketplacePage("home");
    });
  });

  document.getElementById("z-checkout")
    ?.addEventListener("click", () => {
      alert(tx("checkoutComingSoon"));
    });
}

// --------------------------------------------
// 29. SAVED PAGE
// --------------------------------------------

function renderSavedPage() {
  const savedIds = homeState.saved.map(String);

  const products = homeState.products.filter(product =>
    savedIds.includes(String(product.id))
  );

  return `
    <section class="z-home">

      <main class="z-home-content">

        <h1 class="z-page-title">
          ${tx("savedTitle")}
        </h1>

        ${
          products.length
            ? `
              <div id="z-product-area">
                <div class="z-product-grid">
                  ${products.map(productCard).join("")}
                </div>
              </div>
            `
            : `
              <div class="z-empty-state">

                <div class="z-empty-icon">♡</div>

                <h2>${tx("noSaved")}</h2>

                <p>${tx("noSavedText")}</p>

                <button
                  type="button"
                  class="z-primary-button"
                  data-go-home
                >
                  ${tx("exploreProducts")}
                </button>

              </div>
            `
        }

      </main>

    </section>
  `;
}

// --------------------------------------------
// 30. SAVED EVENTS
// --------------------------------------------

function bindSavedEvents() {
  document.querySelectorAll("[data-go-home]").forEach(button => {
    button.addEventListener("click", () => {
      renderMarketplacePage("home");
    });
  });

  updateProductArea();
}

// --------------------------------------------
// 31. ACCOUNT PAGE
// --------------------------------------------

function renderSellerApplicationForm() {
  const sw = language() === "sw";
  const label = (a,b) => sw ? a : b;
  return `<form class="z-seller-form" id="z-seller-application-form">
    <label>${label("Jina la duka *","Store name *")}<input name="store_name" required maxlength="120"></label>
    <label>${label("Jina kamili la mmiliki *","Owner's full name *")}<input name="owner_name" required maxlength="120"></label>
    <label>${label("Namba ya simu *","Phone number *")}<input name="phone" type="tel" required maxlength="30"></label>
    <label>${label("Nchi *","Country *")}<input name="country" required maxlength="80" value="Tanzania"></label>
    <label>${label("Jiji *","City *")}<input name="city" required maxlength="100"></label>
    <label>${label("Aina ya biashara","Business category")}<input name="category" maxlength="100"></label>
    <label>${label("Mkoa","Region")}<input name="region" maxlength="100"></label>
    <label>${label("Wilaya","District")}<input name="district" maxlength="100"></label>
    <label>${label("Anwani ya biashara","Business address")}<textarea name="address" rows="2" maxlength="500"></textarea></label>
    <label>${label("Namba ya TIN (hiari)","TIN number (optional)")}<input name="tin_number" maxlength="80"></label>
    <button type="submit" class="z-primary-button" id="z-seller-submit">${label("Tuma maombi","Submit application")}</button>
    <p class="z-account-message" id="z-seller-form-message" aria-live="polite"></p>
  </form>`;
}

function renderAccountPage() {
  const user = homeState.user;
  const sw = language() === "sw";
  const label = (a,b) => sw ? a : b;
  const email = user?.email || "";
  const name = homeState.accountProfile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || email.split("@")[0] || "ZUNE Customer";
  const role = homeState.accountProfile?.role || "buyer";
  const application = homeState.sellerApplication;
  let sellerContent = "";
  if (role === "vendor") {
    sellerContent = `<section class="z-seller-panel"><h2>${label("Akaunti ya Muuzaji","Seller Account")}</h2><p>${label("Maombi yako yameidhinishwa. Akaunti yako sasa ni ya muuzaji.","Your application is approved. Your account is now a seller account.")}</p><div class="z-seller-status"><strong>${label("Umeidhinishwa","Approved")}</strong>${label("Seller Dashboard itaunganishwa kwenye hatua inayofuata.","Seller Dashboard will be connected in the next step.")}</div></section>`;
  } else if (application) {
    const status = String(application.status || "pending").toLowerCase();
    let title = label("Maombi yametumwa","Application submitted");
    let detail = label("Maombi yako yanasubiri kupitia Admin Mkuu.","Your application is awaiting Admin Mkuu review.");
    if (status === "approved") { title = label("Maombi yameidhinishwa","Application approved"); detail = label("Akaunti yako inasubiri kusasishwa kuwa muuzaji.","Your account is awaiting seller-role update."); }
    if (status === "rejected") { title = label("Maombi yamekataliwa","Application rejected"); detail = application.admin_note || label("Wasiliana na msaada kwa maelezo zaidi.","Contact support for more information."); }
    if (["more_info_required","needs_information","more_information"].includes(status)) { title = label("Tunahitaji maelezo zaidi","More information required"); detail = application.admin_note || label("Tafadhali wasiliana na msaada.","Please contact support."); }
    sellerContent = `<section class="z-seller-panel"><h2>${label("Maombi ya kuwa muuzaji","Seller application")}</h2><div class="z-seller-status"><strong>${title}</strong><span>${safe(detail)}</span><p>${label("Hali","Status")}: ${safe(status)}</p></div>${status === "rejected" ? renderSellerApplicationForm() : ""}</section>`;
  } else {
    sellerContent = `<section class="z-seller-panel"><h2>${label("Kuwa muuzaji ZUNE","Become a ZUNE seller")}</h2><p>${label("Jaza taarifa za biashara yako. Admin Mkuu atapitia maombi yako.","Submit your business details. Admin Mkuu will review your application.")}</p>${renderSellerApplicationForm()}</section>`;
  }
  return `<section class="z-home"><main class="z-home-content"><h1 class="z-page-title">${tx("account")}</h1>
    <div class="z-account-card"><div style="width:75px;height:75px;border-radius:50%;margin:0 auto 13px;display:flex;align-items:center;justify-content:center;background:var(--primary);color:white;font-size:28px;font-weight:900">${safe(name.charAt(0).toUpperCase())}</div><h2>${safe(name)}</h2><p class="z-account-email">${safe(email)}</p><p class="z-account-message">${role === "vendor" ? label("Akaunti ya Muuzaji","Seller Account") : label("Akaunti ya Mteja","Customer Account")}</p></div>
    ${homeState.accountLoading ? `<p class="z-account-message">${label("Inapakia taarifa za akaunti...","Loading account details...")}</p>` : ""}
    ${homeState.accountError ? `<p class="z-account-message" role="alert">${safe(homeState.accountError)}</p>` : ""}
    ${sellerContent}<div style="margin-top:20px"><button type="button" class="z-continue-shopping" data-account-saved>♡ ${tx("saved")}</button><button type="button" class="z-continue-shopping" data-account-cart>${zIcon("cart")} ${tx("cart")}</button><button type="button" class="z-logout-button" id="z-logout-button">${tx("logout")}</button></div>
  </main></section>`;
}

async function loadAccountDetails() {
  const user = homeState.user;
  if (!user?.id || homeState.accountLoadedFor === user.id || homeState.accountLoading) return;
  homeState.accountLoading = true;
  homeState.accountError = "";
  try {
    const [profile, application] = await Promise.all([
      supabase.from("profiles").select("id,full_name,role,is_verified").eq("id",user.id).maybeSingle(),
      supabase.from("seller_applications").select("id,store_name,status,admin_note,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle()
    ]);
    if (profile.error) throw profile.error;
    if (application.error) throw application.error;
    homeState.accountProfile = profile.data || null;
    homeState.sellerApplication = application.data || null;
    homeState.accountLoadedFor = user.id;
  } catch (error) {
    console.error("ZUNE account load error:",error);
    homeState.accountError = language() === "sw" ? "Imeshindikana kupakia taarifa za akaunti." : "Unable to load account details.";
    // Zuia ukurasa kujirudia kuomba data bila mwisho hitilafu ikitokea.
    homeState.accountLoadedFor = user.id;
  } finally {
    homeState.accountLoading = false;
    if (homeState.activeTab === "me") renderMarketplacePage("me");
  }
}

function bindAccountEvents() {
  document.querySelector("[data-account-saved]")?.addEventListener("click",()=>renderMarketplacePage("saved"));
  document.querySelector("[data-account-cart]")?.addEventListener("click",()=>renderMarketplacePage("cart"));
  document.getElementById("z-logout-button")?.addEventListener("click",async()=>{
    if (typeof homeState.onLogout === "function") { await homeState.onLogout(); return; }
    const {error} = await supabase.auth.signOut(); if (error) alert(error.message);
  });
  document.getElementById("z-seller-application-form")?.addEventListener("submit",async event=>{
    event.preventDefault();
    const user = homeState.user;
    const form = event.currentTarget;
    const message = document.getElementById("z-seller-form-message");
    const submit = document.getElementById("z-seller-submit");
    if (!user?.id) { if(message) message.textContent = language()==="sw" ? "Ingia kwanza ili kutuma maombi." : "Please sign in before applying."; return; }
    const data = new FormData(form);
    const store = String(data.get("store_name")||"").trim();
    const payload = {user_id:user.id,store_name:store,business_name:store,owner_name:String(data.get("owner_name")||"").trim(),phone:String(data.get("phone")||"").trim(),country:String(data.get("country")||"").trim(),city:String(data.get("city")||"").trim(),email:user.email||null,category:String(data.get("category")||"").trim()||null,region:String(data.get("region")||"").trim()||null,district:String(data.get("district")||"").trim()||null,address:String(data.get("address")||"").trim()||null,tin_number:String(data.get("tin_number")||"").trim()||null,status:"pending"};
    if(submit) submit.disabled = true;
    if(message) message.textContent = language()==="sw" ? "Inatuma maombi..." : "Submitting application...";
    try {
      const {data:inserted,error} = await supabase.from("seller_applications").insert(payload).select("id,store_name,status,admin_note,created_at").single();
      if(error) throw error;
      homeState.sellerApplication = inserted; homeState.accountLoadedFor = user.id; renderMarketplacePage("me");
    } catch(error) {
      console.error("ZUNE seller application error:",error);
      if(message) message.textContent = error.message || (language()==="sw" ? "Imeshindikana kutuma maombi. Jaribu tena." : "Could not submit application. Please try again.");
      if(submit) submit.disabled = false;
    }
  });
  if(homeState.accountLoadedFor !== homeState.user?.id && !homeState.accountLoading) loadAccountDetails();
}

// 33. MAIN PAGE RENDERER
// --------------------------------------------

function renderMarketplacePage(page) {
  homeState.activeTab = page;

  if (homeState.observer) {
    homeState.observer.disconnect();
    homeState.observer = null;
  }

  const app = homeState.app;

  if (!app) return;

  let content;

  switch (page) {
    case "home":
      content = renderHomePage();
      break;

    case "explore":
      content = renderExplorePage();
      break;

    case "cart":
      content = renderCartPage();
      break;

    case "saved":
      content = renderSavedPage();
      break;

    case "me":
      content = renderAccountPage();
      break;

    default:
      homeState.activeTab = "home";
      content = renderHomePage();
  }

  app.innerHTML = `
    <div class="z-marketplace">

      ${content}

      ${renderBottomNavigation()}

    </div>
  `;

  bindNavigation();

  switch (homeState.activeTab) {
    case "home":
      bindHomeEvents();
      observeInfiniteScroll();
      break;

    case "explore":
      bindExploreEvents();
      observeInfiniteScroll();
      break;

    case "cart":
      bindCartEvents();
      break;

    case "saved":
      bindSavedEvents();
      break;

    case "me":
      bindAccountEvents();
      break;
  }

  updateCartBadges();
}

// --------------------------------------------
// 34. INITIALIZE MARKETPLACE
// --------------------------------------------

export async function renderMarketplaceHome({
  app,
  user,
  onLogout
}) {
  if (!app) {
    console.error("ZUNE: App container haijapatikana.");
    return;
  }

  homeState.app = app;
  homeState.user = user || null;
  homeState.onLogout = onLogout || null;

  addHomeStyles();

  // Onyesha ukurasa wa Home mara moja.
  renderMarketplacePage("home");

  // Pakia categories na bidhaa.
  await Promise.all([
    loadCategories(),
    loadProducts(true)
  ]);

  // Sasisha ukurasa baada ya data kupatikana.
  if (homeState.activeTab === "home") {
    renderMarketplacePage("home");
  }
}

// ============================================
// MWISHO WA HOME.JS
// ZUNE MARKETPLACE 2.0
// ============================================