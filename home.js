// ============================================
// ZUNE MARKETPLACE 2.0
// HOME.JS — SEHEMU YA 1/4
// ============================================

import { supabase } from "./supabase.js";
import { renderSellerDashboard } from "./seller-dashboard.js";
import { renderCartPage as renderCartView, bindCartEvents as bindCartViewEvents, loadCartProducts } from "./cart.js";

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
  featuredStores: [],
  sponsoredCampaigns: [],
  sponsoredProducts: [],
  sponsoredStores: [],
  sponsoredAdsLoaded: false,
  selectedVendor: "",
  searchSuggestionsOpen: false,

  selectedCategory: "",
  search: "",

  page: 0,
  loading: false,
  loadError: false,
  hasMore: true,

  activeTab: "home",

  saved: [],
  cart: [],
  cartProducts: [],
  cartProductsKey: "",
  cartProductsLoading: false,
  cartProductsError: false,

  user: null,
  app: null,
  onLogout: null,
  accountProfile: null,
  sellerApplication: null,
  customerVerificationRequest: null,
  accountLoading: false,
  accountLoadedFor: null,
  accountError: "",
  accountNavigating: false,

  observer: null,
  requestId: 0,
  carouselIndex: 0,
  carouselTimer: null
};

// --------------------------------------------
// 2. LANGUAGE TRANSLATIONS
// --------------------------------------------

const homeText = {
  sw: {
    search: "Tafuta bidhaa...",
    categories: "Makundi ya bidhaa",
    allCategories: "Makundi yote",
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
    allCategories: "All categories",
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

function userStorageKey(baseKey) {
  const userId = homeState.user?.id;
  return userId ? `${baseKey}:${userId}` : null;
}

function readUserStorage(baseKey, fallback) {
  const key = userStorageKey(baseKey);
  if (!key) return fallback;
  return readStorage(key, fallback);
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
  const key = userStorageKey("zune_cart");
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(homeState.cart));
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

    notification: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',

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

    .z-search-box { position:relative; }
    .z-search-suggestions{position:absolute;top:calc(100% + 7px);left:0;right:0;z-index:40;display:none;max-height: min(55vh,360px);overflow:auto;padding:7px;border:1px solid var(--border);border-radius:14px;background:var(--surface);box-shadow:0 12px 30px rgba(0,0,0,.14)}
    .z-search-suggestions.open{display:block}
    .z-search-suggestion{width:100%;display:flex;align-items:center;gap:10px;padding:10px;border:0;border-radius:9px;background:transparent;color:var(--text);text-align:left;font-size:12px;cursor:pointer}
    .z-search-suggestion:hover{background:var(--background)}
    .z-search-suggestion small{display:block;color:var(--text-muted);margin-top:3px}
    .z-product-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(155px,43%);gap:11px;overflow-x:auto;padding:2px 1px 13px;scroll-snap-type:x mandatory;scrollbar-width:none}
    .z-product-row>.z-product-card{scroll-snap-align:start}
    @media(min-width:700px){.z-product-row{grid-auto-columns:minmax(190px,24%)}}
    .z-featured-stores{display:flex;gap:11px;overflow-x:auto;padding:3px 1px 12px;scrollbar-width:none}
    .z-featured-stores::-webkit-scrollbar{display:none}
    .z-featured-store{flex:0 0 175px;min-height:84px;padding:13px;border:1px solid var(--border);border-radius:15px;background:var(--surface);color:var(--text);text-align:left}
    .z-featured-store strong{display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .z-featured-store small{display:block;margin-top:7px;color:var(--text-muted);font-size:10px}
    .z-featured-store .store-verified{color:var(--verified-store);font-weight:800}
    .z-sponsored-placeholder{display:none}
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


    .z-home-carousel{position:relative;overflow:hidden;min-height:230px;margin:0 0 25px;border-radius:22px;isolation:isolate;background:var(--primary);color:#fff;touch-action:pan-y}
    .z-slide-image{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover}
    .z-home-carousel:after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(10,18,15,.9),rgba(10,18,15,.58) 60%,rgba(10,18,15,.12))}
    .z-slide-copy{position:relative;z-index:1;min-height:230px;max-width:560px;padding:27px 23px 49px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center}
    .z-slide-kicker{margin-bottom:10px;font-size:10px;font-weight:900;letter-spacing:1.4px;color:#fff}
    .z-slide-copy h2{max-width:460px;margin:0 0 9px;font-size:clamp(22px,4vw,32px);line-height:1.12;font-weight:900;color:#fff}
    .z-slide-copy p{max-width:430px;margin:0 0 16px;font-size:13px;line-height:1.55;color:#fff}
    .z-slide-cta{min-height:39px;padding:0 17px;border:0;border-radius:11px;background:#fff;color:#17231e;font-size:12px;font-weight:900;cursor:pointer}
    .z-slide-controls{position:absolute;z-index:2;left:18px;right:18px;bottom:12px;display:flex;align-items:center;justify-content:space-between}
    .z-slide-dots{display:flex;align-items:center;gap:6px}
    .z-slide-dot{width:7px;height:7px;padding:0;border:0;border-radius:20px;background:rgba(255,255,255,.55);cursor:pointer}
    .z-slide-dot.active{width:22px;background:#fff}
    .z-slide-arrows{display:flex;gap:7px}
    .z-slide-arrow{width:29px;height:29px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.55);border-radius:50%;background:rgba(0,0,0,.18);color:#fff;font-size:17px;cursor:pointer}
    .z-category-heading-actions{display:flex;align-items:center;gap:8px}
    .z-all-categories{border:0;padding:7px 10px;border-radius:9px;background:var(--background);color:var(--primary);font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap}
    .z-category-directory{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:0 0 17px}
    .z-category-directory .z-category{text-align:left;min-height:44px}
    @media(min-width:700px){.z-home-carousel,.z-slide-copy{min-height:285px}.z-slide-copy{padding:34px 34px 54px}.z-category-directory{grid-template-columns:repeat(4,minmax(0,1fr))}}

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
      gap: 12px;
      align-items: stretch;
    }

    .z-sponsored-products{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.z-sponsored-card{position:relative;min-width:0}.z-sponsored-label,.z-sponsored-note{display:inline-flex;align-items:center;background:#fff2df;color:#9a570c;border:1px solid #f2d4aa;border-radius:999px;padding:4px 9px;font-size:10px;font-weight:800;margin-bottom:6px}.z-sponsored-card .z-product-card{height:100%}.z-sponsored-empty{grid-column:1/-1;color:var(--z-muted,#777);font-size:13px;padding:12px 0}.z-sponsored-stores{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.z-sponsored-store{border:1px solid var(--border,#e4ebe7);border-radius:14px;background:var(--surface,#fff);padding:12px;display:flex;flex-direction:column;gap:8px}.z-sponsored-store strong{font-size:14px}.z-sponsored-store button{align-self:flex-start;border:0;background:transparent;color:var(--primary,#087b5a);font-weight:700;padding:0}@media(min-width:700px){.z-sponsored-products{grid-template-columns:repeat(4,minmax(0,1fr))}}
    .z-product-card {
      min-width: 0;
      overflow: hidden;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      position: relative;
      box-shadow: 0 5px 18px color-mix(in srgb, var(--text) 7%, transparent);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .z-product-card:active { transform: scale(.985); }
    .z-product-card:focus-visible { outline: 3px solid var(--primary); outline-offset: 3px; }
    @media (hover:hover) {
      .z-product-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px color-mix(in srgb, var(--text) 12%, transparent); }
    }

    .z-product-media {
      position: relative;
      overflow: hidden;
      aspect-ratio: 4 / 4.6;
      background: var(--background);
    }
    .z-product-gallery {
      position: absolute; inset: 0; display: flex; overflow-x: auto; overflow-y: hidden;
      scroll-snap-type: x mandatory; scrollbar-width: none; overscroll-behavior-x: contain;
      background: var(--background);
    }
    .z-product-gallery::-webkit-scrollbar { display: none; }
    .z-product-gallery .z-product-image {
      flex: 0 0 100%; width: 100%; min-width: 100%; height: 100%;
      display: block; object-fit: cover; scroll-snap-align: start;
    }
    .z-product-image-count {
      position: absolute; right: 9px; bottom: 9px; z-index: 1; padding: 5px 8px;
      border: 1px solid rgb(255 255 255 / 25%); border-radius: 20px;
      background: rgb(0 0 0 / 58%); color: #fff; font-size: 9px; font-weight: 800;
      pointer-events: none;
    }
    .z-verified-account-mark {
      flex: 0 0 auto; width: 17px; height: 17px; display: inline-grid; place-items: center;
      vertical-align: middle;
    }
    .z-verified-account-mark svg { display: block; width: 100%; height: 100%; }
    .z-product-image,
    .z-product-placeholder {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--background);
    }
    .z-product-placeholder { font-size: 40px; }
    .z-product-flags {
      position: absolute;
      top: 9px;
      left: 9px;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      max-width: calc(100% - 54px);
    }
    .z-product-flag {
      display: inline-flex;
      align-items: center;
      min-height: 23px;
      padding: 4px 7px;
      border-radius: 7px;
      background: var(--primary);
      color: #fff;
      font-size: 9px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: .2px;
      box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
    }
    .z-product-flag.discount { background: var(--danger); }
    .z-product-flag.new { background: var(--primary); }
    .z-product-flag.featured { background: var(--secondary); color: var(--text); }
    .z-save-product {
      position: absolute;
      z-index: 2;
      top: 9px;
      right: 9px;
      border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
      background: color-mix(in srgb, var(--surface) 92%, transparent);
      color: var(--text);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 19px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgb(0 0 0 / 9%);
    }
    .z-save-product.is-saved { color: var(--danger); }
    .z-product-info {
      padding: 11px 11px 12px;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .z-product-name {
      font-size: 13px;
      font-weight: 750;
      line-height: 1.38;
      margin: 0 0 7px;
      min-height: 36px;
      overflow-wrap: anywhere;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      color: var(--text);
    }
    .z-product-price-line {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 5px 7px;
      margin-bottom: 6px;
    }
    .z-product-price {
      font-size: 14px;
      font-weight: 900;
      color: var(--primary);
      margin: 0;
      letter-spacing: -.2px;
    }
    .z-product-old-price {
      color: var(--text-muted);
      font-size: 10px;
      text-decoration: line-through;
    }
    .z-product-rating {
      display: flex;
      align-items: center;
      gap: 4px;
      min-height: 16px;
      margin: 0 0 8px;
      color: var(--text-muted);
      font-size: 10px;
    }
    .z-product-rating-star { color: var(--secondary); font-size: 12px; }
    .z-product-store {
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid var(--border);
      color: var(--text);
      font-size: 10px;
      font-weight: 750;
    }
    .z-store-open { border:0; padding:0; background:transparent; color:inherit; font:inherit; text-align:left; cursor:pointer; }\n    .z-store-open:hover,.z-store-open:focus-visible { color:var(--primary); text-decoration:underline; }\n    .z-product-store-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .z-verified-store-mark {
      flex: 0 0 auto;
      display: inline-grid;
      place-items: center;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--verified-store);
      color: #fff;
      font-size: 9px;
      font-weight: 900;
    }
    .z-product-location {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 5px;
      color: var(--text-muted);
      font-size: 9px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .z-product-stock {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 6px;
      font-size: 9px;
      font-weight: 750;
      color: var(--danger);
    }
    @media (min-width: 700px) {
      .z-product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
      .z-product-info { padding: 13px; }
      .z-product-name { font-size: 14px; }
      .z-product-price { font-size: 16px; }
    }
    @media (min-width: 1050px) {
      .z-product-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
    }
    @media (min-width: 1380px) {
      .z-product-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    }

    .z-product-category {
      font-size: 11px;
      color: var(--text-muted);
      margin: 0 0 10px;
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

    .z-product-detail-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 14px;
      background: rgb(0 0 0 / 55%);
      backdrop-filter: blur(4px);
    }
    .z-product-detail-sheet {
      position: relative;
      width: min(100%, 620px);
      max-height: min(92vh, 900px);
      overflow: auto;
      border-radius: 22px 22px 16px 16px;
      background: var(--surface);
      color: var(--text);
      box-shadow: 0 20px 70px rgb(0 0 0 / 25%);
    }
    .z-detail-close {
      position: absolute;
      z-index: 3;
      top: 12px;
      right: 12px;
      width: 38px;
      height: 38px;
      border: 1px solid var(--border);
      border-radius: 50%;
      background: color-mix(in srgb, var(--surface) 90%, transparent);
      color: var(--text);
      font-size: 25px;
    }
    .z-detail-image-wrap { position: relative; aspect-ratio: 1 / .82; overflow: hidden; background: var(--background); }
    .z-detail-image-wrap .z-product-image { width: 100%; height: 100%; object-fit: contain; }
    .z-detail-content { padding: 18px; }
    .z-detail-content h2 { margin: 13px 0 8px; font-size: 20px; line-height: 1.3; }
    .z-detail-price { color: var(--primary); font-size: 21px; font-weight: 900; margin: 0 0 12px; }
    .z-detail-description { color: var(--text-muted); font-size: 13px; line-height: 1.65; white-space: pre-wrap; margin: 0 0 12px; }
    .z-detail-category,.z-detail-stock { color: var(--text-muted); font-size: 12px; margin: 0 0 9px; }
    .z-detail-add { margin-top: 14px; }
    @media (min-width: 700px) {
      .z-product-detail-overlay { align-items: center; }
      .z-product-detail-sheet { border-radius: 22px; }
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

    .z-account-page .z-home-content{max-width:820px;padding-top:18px;padding-bottom:30px}
    .z-account-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
    .z-account-heading .z-page-title{margin:3px 0 0}
    .z-account-heading-mark{color:var(--primary);font-size:13px;font-weight:900}
    .z-account-eyebrow{display:block;color:var(--text-muted);font-size:9px;font-weight:900;letter-spacing:1.2px;margin-bottom:6px}
    .z-account-hero{display:flex;align-items:center;gap:14px;padding:19px;border:1px solid var(--border);border-radius:22px;background:var(--surface);box-shadow:var(--shadow)}
    .z-account-avatar{width:68px;height:68px;flex:0 0 68px;display:grid;place-items:center;border-radius:50%;background:var(--primary);color:#fff;font-size:23px;font-weight:900;object-fit:cover}
    .z-account-identity{min-width:0;flex:1}.z-account-identity h2{margin:0 0 4px;font-size:clamp(16px,3vw,20px);overflow-wrap:anywhere}.z-account-identity p{margin:0;color:var(--text-muted);font-size:11px;overflow-wrap:anywhere}
    .z-account-role{display:inline-flex;padding:6px 10px;border-radius:30px;background:var(--background);color:var(--primary);font-size:9px;font-weight:900;white-space:nowrap}.z-account-role.vendor{background:var(--verified-store);color:#fff}
    .z-account-verified{display:inline-flex;align-items:center;gap:5px;margin-top:8px;color:var(--verified-account);font-size:10px;font-weight:850}.z-account-verified svg{width:18px;height:18px}
    .z-account-section{margin-top:17px;padding:17px;border:1px solid var(--border);border-radius:20px;background:var(--surface)}
    .z-account-section h2{margin:0 0 8px;font-size:16px}.z-account-section p{color:var(--text-muted);font-size:12px;line-height:1.55}
    .z-account-section-heading{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:13px}.z-account-section-heading h2{margin:0}
    .z-account-seller{border-color:color-mix(in srgb,var(--primary) 28%,var(--border))}
    .z-account-shortcuts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .z-account-shortcut,.z-account-menu-row{width:100%;min-width:0;min-height:68px;display:flex;align-items:center;gap:11px;padding:11px;border:1px solid var(--border);border-radius:15px;background:var(--background);color:var(--text);text-align:left;cursor:pointer}
    .z-account-shortcut>span:nth-child(2),.z-account-menu-row>span:nth-child(2){min-width:0;flex:1}
    .z-account-shortcut strong,.z-account-shortcut small,.z-account-menu-row strong,.z-account-menu-row small{display:block}.z-account-shortcut strong,.z-account-menu-row strong{font-size:12px}.z-account-shortcut small,.z-account-menu-row small{margin-top:4px;color:var(--text-muted);font-size:10px;line-height:1.35}
    .z-account-shortcut>b,.z-account-menu-row>b{color:var(--text-muted);font-size:21px;font-weight:400}
    .shortcut-icon{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;border-radius:13px;background:var(--surface);color:var(--primary);font-size:19px;font-weight:800}.shortcut-icon.saved{color:#D94F83}
    .z-account-menu-row{margin-top:9px;min-height:58px;background:var(--surface)}
    .z-account-logout{width:100%;min-height:49px;margin-top:18px;border:1px solid color-mix(in srgb,var(--danger) 35%,var(--border));border-radius:14px;background:var(--surface);color:var(--danger);font-weight:850;cursor:pointer}
    .z-account-version{padding:17px 0 4px;color:var(--text-muted);font-size:9px;font-weight:800;letter-spacing:1.5px;text-align:center}
    .z-account-seller .z-seller-form{margin-top:15px}
    .z-seller-status.pending{border-left:3px solid #D99A28}.z-seller-status.approved{border-left:3px solid #159447}.z-seller-status.rejected{border-left:3px solid var(--danger)}.z-seller-status.review{border-left:3px solid #2586CE}
    @media(min-width:620px){.z-account-shortcuts{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:480px){.z-account-hero{gap:10px;padding:14px}.z-account-avatar{width:56px;height:56px;flex-basis:56px}.z-account-identity h2{font-size:14px}.z-account-role{font-size:8px}.z-account-section{padding:14px}.z-account-shortcuts{gap:8px}.z-account-shortcut{padding:9px;gap:8px}.shortcut-icon{width:35px;height:35px;flex-basis:35px}}
    @media(max-width:350px){.z-account-shortcuts{grid-template-columns:1fr}.z-account-role{display:none}}
    .z-seller-panel { margin-top:18px; padding:18px; border:1px solid var(--border,#e4ebe7); border-radius:17px; background:var(--surface,#fff); }
    .z-seller-panel h2 { margin:0 0 8px; font-size:17px; }
    .z-seller-panel p { color:var(--text-muted,#71817a); line-height:1.5; font-size:13px; }
    .z-seller-status { padding:12px; border-radius:11px; background:var(--background,#f5f7f6); margin:12px 0; }
    .z-seller-status strong { display:block; margin-bottom:5px; }
    .z-theme-panel { margin-top: 18px; }
    .z-theme-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; margin-top:14px; }
    .z-theme-option { min-width:0; display:flex; align-items:center; gap:8px; padding:10px; border:1px solid var(--border); border-radius:12px; background:var(--surface); color:var(--text); text-align:left; font-size:12px; font-weight:700; cursor:pointer; }
    .z-theme-option.active { border:2px solid var(--primary); padding:9px; }
    .z-theme-swatch { width:23px; height:23px; flex:0 0 23px; border-radius:50%; background:var(--theme-swatch); box-shadow:inset 0 0 0 2px rgba(255,255,255,.45); }
    .z-theme-check { margin-left:auto; color:var(--primary); font-weight:900; }
    .z-seller-form { display:grid; gap:12px; margin-top:14px; }
    .z-seller-form label { display:grid; gap:6px; font-size:12px; font-weight:700; }
    .z-seller-form input,.z-seller-form textarea { width:100%; min-height:44px; box-sizing:border-box; padding:10px 12px; border:1px solid var(--border,#e4ebe7); border-radius:10px; background:var(--background,#f5f7f6); color:var(--text,#17231e); font:inherit; }
    .z-seller-form button:disabled { opacity:.6; cursor:wait; }
    .z-account-message { margin:10px 0; color:var(--text-muted,#71817a); font-size:13px; }
    .z-account-verification { border-color:color-mix(in srgb,var(--verified-account) 24%,var(--border)); }
    .z-account-verification .z-seller-status { margin:12px 0; }
    .z-account-verification .z-seller-form { margin-top:13px; }
    .z-account-verification .z-primary-button { min-height:44px; }

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

    .zune-wave-transition{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px;background:var(--background);color:var(--primary);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .18s ease,visibility .18s ease}
    .zune-wave-transition.active{opacity:1;visibility:visible;pointer-events:auto}
    .zune-wave-wordmark{display:flex;align-items:center;gap:5px;font-size:clamp(48px,14vw,76px);font-weight:950;letter-spacing:-3px;color:var(--primary)}
    .zune-wave-wordmark span{display:inline-block;animation:zuneLetterWave .62s cubic-bezier(.2,.75,.25,1) both;animation-delay:calc(var(--letter-index)*.09s)}
    .zune-wave-caption{font-size:10px;font-weight:900;letter-spacing:3px;color:var(--text-muted)}
    @keyframes zuneLetterWave{0%{transform:translateY(28px) rotate(8deg);opacity:0}45%{transform:translateY(-13px) rotate(-5deg);opacity:1}72%{transform:translateY(5px) rotate(2deg)}100%{transform:translateY(0) rotate(0);opacity:1}}
    .z-account-hero{cursor:pointer}
    .z-account-shortcut,.z-account-menu-row,.z-account-seller{transition:transform .18s ease,border-color .18s ease}
    .z-account-shortcut:active,.z-account-menu-row:active{transform:scale(.985)}
    @media(prefers-reduced-motion:reduce){.zune-wave-wordmark span{animation-duration:.01ms;animation-delay:0ms}}

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

    if (homeState.selectedVendor) query = query.eq("vendor_id", homeState.selectedVendor);

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

    // Attach public store details and account verification to product owners.
    const vendorIds = [...new Set(products.map(item => item.vendor_id).filter(Boolean))];
    if (vendorIds.length) {
      try {
        const { data: stores, error: storesError } = await supabase
          .from("stores")
          .select("owner_id,store_name,verification_status,region,district,address")
          .in("owner_id", vendorIds);
        if (storesError) throw storesError;
        const storeByOwner = new Map((stores || []).map(store => [String(store.owner_id), store]));
        products.forEach(item => { item.__zuneStore = storeByOwner.get(String(item.vendor_id)) || null; });
        const merged=new Map((homeState.featuredStores||[]).map(st=>[String(st.owner_id),st]));
        (stores||[]).forEach(st=>merged.set(String(st.owner_id),st));
        homeState.featuredStores=[...merged.values()].slice(0,20);
        const featuredHolder=document.getElementById("z-featured-stores");if(featuredHolder)featuredHolder.innerHTML=renderFeaturedStores();
      } catch (storeError) {
        console.warn("ZUNE store details unavailable for product cards:", storeError);
      }
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id,is_verified,role")
          .in("id", vendorIds);
        if (profilesError) throw profilesError;
        const profileById = new Map((profiles || []).map(profile => [String(profile.id), profile]));
        products.forEach(item => { item.__zuneOwnerProfile = profileById.get(String(item.vendor_id)) || null; });
      } catch (profileError) {
        console.warn("ZUNE owner verification status unavailable for product cards:", profileError);
      }
    }

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
      if (!homeState.sponsoredAdsLoaded) loadSponsoredCampaigns();
    }
  }
}

async function loadSponsoredCampaigns() {
  if (homeState.sponsoredAdsLoaded) return;
  homeState.sponsoredAdsLoaded = true;
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("ad_campaigns")
      .select("id,store_id,seller_id,product_id,campaign_type,placement,title,starts_at,ends_at")
      .eq("status", "approved").order("created_at", { ascending: false }).limit(40);
    if (error) throw error;
    const liveCampaigns = (data || []).filter(c => (!c.starts_at || c.starts_at <= now) && (!c.ends_at || c.ends_at > now));
    homeState.sponsoredStores = liveCampaigns.filter(c => c.campaign_type === "sponsored_store" && ["home","home_feed"].includes(String(c.placement||"").toLowerCase()));
    const campaigns = liveCampaigns.filter(c =>
      ["sponsored_product", "combo"].includes(c.campaign_type) &&
      ["home", "home_feed", "trending", "recommendations", "category", "search"].includes(String(c.placement || "").toLowerCase()) && c.product_id
    );
    const productIds = [...new Set(campaigns.map(c => c.product_id))];
    if (!productIds.length) { updateProductArea(); bindSponsoredAdEvents(); return; }
    const { data: products, error: productError } = await supabase.from("products").select("*").in("id", productIds);
    if (productError) throw productError;
    const byId = new Map((products || []).map(p => [String(p.id), p]));
    const vendorIds = [...new Set((products || []).map(p => p.vendor_id).filter(Boolean))];
    let stores = [], profiles = [];
    if (vendorIds.length) {
      const [storeResult, profileResult] = await Promise.all([
        supabase.from("stores").select("owner_id,store_name,verification_status,region,district,address").in("owner_id", vendorIds),
        supabase.from("profiles").select("id,is_verified,role").in("id", vendorIds)
      ]);
      if (!storeResult.error) stores = storeResult.data || [];
      if (!profileResult.error) profiles = profileResult.data || [];
    }
    const storeMap = new Map(stores.map(x => [String(x.owner_id), x]));
    const profileMap = new Map(profiles.map(x => [String(x.id), x]));
    homeState.sponsoredCampaigns = campaigns.filter(c => byId.has(String(c.product_id)));
    homeState.sponsoredProducts = homeState.sponsoredCampaigns.map(c => {
      const p = byId.get(String(c.product_id));
      p.__zuneStore = storeMap.get(String(p.vendor_id)) || null;
      p.__zuneOwnerProfile = profileMap.get(String(p.vendor_id)) || null;
      return { campaign: c, product: p };
    });
    updateProductArea();
    bindSponsoredAdEvents();
  } catch (error) {
    homeState.sponsoredAdsLoaded = false;
    console.warn("ZUNE sponsored ads unavailable:", error);
  }
}

function openSponsoredStore(sellerId){
  if(!sellerId)return;
  homeState.selectedVendor=String(sellerId);homeState.selectedCategory="";homeState.search="";
  renderMarketplacePage("explore");loadProducts(true);
}

function recordSponsoredEvent(campaignId, eventType) {
  if (!campaignId) return;
  supabase.from("ad_events").insert({ campaign_id: campaignId, event_type: eventType })
    .then(({ error }) => { if (error) console.warn("Ad event was not recorded:", error.message); });
}

function bindSponsoredAdEvents() {
  const hosts = [document.getElementById("z-sponsored-products"), document.getElementById("z-explore-sponsored-products"), document.getElementById("z-sponsored-stores")].filter(Boolean);
  if (!hosts.length) return;
  hosts.forEach(host => host.querySelectorAll("[data-sponsored-campaign]").forEach(card => {
    if (card.dataset.impressionBound) return;
    card.dataset.impressionBound = "1";
    const campaignId = card.dataset.sponsoredCampaign;
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { recordSponsoredEvent(campaignId, "impression"); observer.disconnect(); }
        });
      }, { threshold: 0.5 });
      observer.observe(card);
    }
    card.querySelector("[data-open-product]")?.addEventListener("click", () => recordSponsoredEvent(campaignId, "click"), { once: true });
    card.querySelector("[data-sponsored-open]")?.addEventListener("click", () => { recordSponsoredEvent(campaignId, card.dataset.sponsoredEvent || "store_visit"); openSponsoredStore(card.querySelector("[data-sponsored-open]").dataset.sponsoredOpen); }, { once: true });
    card.querySelector("[data-open-product]")?.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") recordSponsoredEvent(campaignId, "click");
    }, { once: true });
  }));
}

// --------------------------------------------
// 9. PRODUCT IMAGE
// --------------------------------------------

function productImage(product) {
  let images = Array.isArray(product.image_urls) ? product.image_urls : [];
  if (typeof product.image_urls === "string") {
    try {
      const parsed = JSON.parse(product.image_urls);
      if (Array.isArray(parsed)) images = parsed;
    } catch (_) {
      images = product.image_urls.trim() ? [product.image_urls.trim()] : [];
    }
  }
  images = images.map(item => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") return item.url || item.publicUrl || item.public_url || item.src || "";
    return "";
  }).filter(Boolean);
  const primaryImage = product.image_url || "";
  if (primaryImage && !images.includes(primaryImage)) images.unshift(primaryImage);
  images = [...new Set(images)];
  if (!images.length) {
    return `<div class="z-product-placeholder"><span>📦</span></div>`;
  }
  return `
    <div class="z-product-gallery" aria-label="${safe(product.title || tx("emptyName"))} — ${images.length} ${language()==="sw"?"picha":"photos"}">
      ${images.map((image, index) => `
        <img class="z-product-image" src="${safe(image)}" alt="${safe(product.title || tx("emptyName"))} — ${index + 1}" loading="lazy" onerror="this.style.display='none'">
      `).join("")}
      ${images.length > 1 ? `<span class="z-product-image-count">${images.length} ${language()==="sw"?"picha":"photos"}</span>` : ""}
    </div>
  `;
}

// --------------------------------------------
// 10. PRODUCT CARD
// --------------------------------------------

function productCard(product) {
  const id = String(product.id);
  const isSaved = homeState.saved.map(String).includes(id);
  const store = product.__zuneStore || null;
  const ownerProfile = product.__zuneOwnerProfile || null;
  const accountVerified = ownerProfile?.is_verified === true;
  const currentPrice = Number(product.price || 0);
  const oldPrice = Number(product.compare_at_price || product.original_price || 0);
  const rating = Number(product.average_rating || product.rating_average || product.rating || 0);
  const reviews = Number(product.review_count || product.reviews_count || 0);
  const stock = product.stock_quantity == null ? null : Number(product.stock_quantity);
  const createdAt = product.created_at ? new Date(product.created_at).getTime() : 0;
  const isNew = createdAt > 0 && Date.now() - createdAt < 7 * 24 * 60 * 60 * 1000;
  const discount = oldPrice > currentPrice && currentPrice > 0
    ? Math.round((1 - currentPrice / oldPrice) * 100) : 0;
  const flags = [
    discount ? `<span class="z-product-flag discount">-${discount}%</span>` : "",
    product.is_featured || product.featured ? `<span class="z-product-flag featured">${language()==="sw"?"Featured":"Featured"}</span>` : "",
    !discount && !product.is_featured && !product.featured && isNew ? `<span class="z-product-flag new">${language()==="sw"?"Mpya":"New"}</span>` : ""
  ].filter(Boolean).join("");
  const storeName = store?.store_name || product.store_name || product.seller_name || (language()==="sw"?"Muuzaji wa ZUNE":"ZUNE Seller");
  const verified = store?.verification_status === "verified";
  const location = [store?.district || product.district, store?.region || product.region, store?.address || product.location]
    .filter(Boolean).slice(0,2).join(", ");
  const ratingMarkup = rating > 0
    ? `<div class="z-product-rating"><span class="z-product-rating-star">★</span><strong>${rating.toFixed(1)}</strong>${reviews > 0 ? `<span>(${reviews.toLocaleString()})</span>` : ""}</div>`
    : "";
  const stockMarkup = stock !== null && stock <= 0
    ? `<div class="z-product-stock">${language()==="sw"?"Imeisha":"Out of stock"}</div>` : "";

  return `
    <article class="z-product-card" data-open-product="${safe(id)}" tabindex="0" role="button" aria-label="${safe(product.title || tx("emptyName"))}">
      <div class="z-product-media">
        ${productImage(product)}
        <div class="z-product-flags">${flags}</div>
        <button type="button" class="z-save-product ${isSaved ? "is-saved" : ""}" data-save-product="${safe(id)}" aria-label="${isSaved ? "Remove saved product" : "Save product"}" aria-pressed="${isSaved}">
          ${isSaved ? "♥" : "♡"}
        </button>
      </div>
      <div class="z-product-info">
        <h3 class="z-product-name">${safe(product.title || tx("emptyName"))}</h3>
        <div class="z-product-price-line">
          <p class="z-product-price">${money(currentPrice)}</p>
          ${oldPrice > currentPrice ? `<span class="z-product-old-price">${money(oldPrice)}</span>` : ""}
        </div>
        ${ratingMarkup}
        <div class="z-product-store">
          <button type="button" class="z-product-store-name z-store-open" data-open-store="${safe(product.vendor_id||"")}">${safe(storeName)}</button>
          ${accountVerified ? '<span class="z-verified-account-mark" title="Verified Account" aria-label="Verified Account"><svg viewBox="-30 -30 60 60" role="img"><g fill="#F28C28"><rect x="-22" y="-22" width="44" height="44" rx="6"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(30)"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(60)"/></g><path d="M-9 0 L-3 6 L10 -7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : ""}
        </div>
        ${location ? `<div class="z-product-location">⌖ ${safe(location)}</div>` : ""}
        ${stockMarkup}
      </div>
    </article>
  `;
}

// --------------------------------------------
// 11. PRODUCT DETAILS QUICK VIEW
// --------------------------------------------

function openStoreDetails(ownerId, product = null) {
  if (!ownerId) return;
  document.getElementById("z-store-detail-overlay")?.remove();
  const cachedStore = product?.__zuneStore || null;
  const cachedProfile = product?.__zuneOwnerProfile || null;
  const fallback = cachedStore?.store_name || product?.store_name || product?.seller_name || (language()==="sw"?"Duka la ZUNE":"ZUNE Store");
  const overlay = document.createElement("div");
  overlay.id = "z-store-detail-overlay";
  overlay.className = "z-product-detail-overlay";
  overlay.innerHTML = `<section class="z-product-detail-sheet z-storefront-sheet" role="dialog" aria-modal="true" aria-label="${safe(fallback)}">
    <button type="button" class="z-detail-close" aria-label="Close">×</button>
    <div class="z-storefront-banner"><span class="z-storefront-brand">ⓏⓊⓃⒺ MARKETPLACE</span><div class="z-storefront-heading"><h2 id="z-store-detail-name">${safe(fallback)}</h2><div id="z-store-detail-status" class="z-product-store"></div><p id="z-store-detail-location" class="z-product-location"></p></div></div>
    <div class="z-storefront-content"><div class="z-storefront-section-head"><div><span class="z-account-eyebrow">${language()==="sw"?"DUKA LA SELLER":"SELLER STOREFRONT"}</span><h3>${language()==="sw"?"Bidhaa za duka":"Store products"}</h3></div><span id="z-storefront-count" class="z-storefront-count"></span></div>
    <p id="z-store-detail-message" class="z-account-message">${language()==="sw"?"Inapakia taarifa na bidhaa za duka...":"Loading store information and products..."}</p>
    <div id="z-storefront-products" class="z-storefront-product-grid"></div></div>
  </section>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
  overlay.querySelector(".z-detail-close")?.addEventListener("click",close);

  const badgeMarkup=(store,profile)=>{
    const verifiedStore=String(store?.verification_status||"").toLowerCase()==="verified";
    const verifiedAccount=profile?.is_verified===true;
    return (verifiedStore?'<span class="z-verified-store-mark" title="Verified Store">✓</span><strong>Verified Store</strong>':(language()==="sw"?"Duka halijathibitishwa":"Store not verified"))+
      (verifiedAccount?'<span class="z-verified-account-mark" title="Verified Account"><svg viewBox="-30 -30 60 60"><g fill="#F28C28"><rect x="-22" y="-22" width="44" height="44" rx="6"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(30)"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(60)"/></g><path d="M-9 0 L-3 6 L10 -7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><strong>Verified Account</strong>':"");
  };

  if(!document.getElementById("zuneStorefrontTemplateStyles")){
    const style=document.createElement("style");
    style.id="zuneStorefrontTemplateStyles";
    style.textContent=`
      .z-storefront-sheet{width:min(760px,100%);max-height:92vh;overflow:auto;padding:0!important;background:var(--surface,#fff)}
      .z-storefront-banner{padding:24px 22px 20px;background:linear-gradient(135deg,#087a55,#064d39);color:#fff}
      .z-storefront-brand{font-size:10px;font-weight:800;letter-spacing:2px;opacity:.8}
      .z-storefront-heading h2{margin:12px 0 8px;color:inherit;font-size:25px}
      .z-storefront-heading .z-product-store{color:inherit;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
      .z-storefront-heading .z-product-location{color:rgba(255,255,255,.8);margin:8px 0 0}
      .z-storefront-content{padding:20px}
      .z-storefront-section-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:14px}
      .z-storefront-section-head h3{margin:5px 0 0;font-size:18px}
      .z-storefront-count{font-size:12px;color:var(--text-muted)}
      .z-storefront-product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .z-storefront-product-grid .z-product-card{min-width:0}
      .z-storefront-sheet[data-zune-store-template="editorial"] .z-storefront-banner{background:#29251f}
      .z-storefront-sheet[data-zune-store-template="hero"] .z-storefront-banner{background:linear-gradient(135deg,#101d35,#314b73);padding:42px 24px}
      .z-storefront-sheet[data-zune-store-template="compact"] .z-storefront-content{padding:12px}
      .z-storefront-sheet[data-zune-store-template="compact"] .z-storefront-product-grid{gap:7px}
      .z-storefront-sheet[data-zune-store-template="boutique"] .z-storefront-banner{background:#34251f}
      .z-storefront-sheet[data-zune-store-template="catalog"] .z-storefront-product-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
      .z-storefront-sheet[data-zune-store-template="stories"] .z-storefront-banner{background:linear-gradient(135deg,#58366b,#a66eae)}
      .z-storefront-sheet[data-zune-store-template="minimal"] .z-storefront-banner{background:#f4f4f1;color:#242424}
      .z-storefront-sheet[data-zune-store-template="minimal"] .z-storefront-product-grid .z-product-card{box-shadow:none;border-radius:0}
      .z-storefront-sheet[data-zune-store-template="deals"] .z-storefront-banner{background:linear-gradient(135deg,#a94c12,#e58b2a)}
      .z-storefront-sheet[data-zune-store-template="showcase"] .z-storefront-banner{background:linear-gradient(135deg,#111820,#354b5d)}
      @media(max-width:520px){.z-storefront-product-grid,.z-storefront-sheet[data-zune-store-template="catalog"] .z-storefront-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.z-storefront-content{padding:14px}}
    `;
    document.head.appendChild(style);
  }

  Promise.all([
    supabase.from("stores").select("owner_id,store_name,verification_status,region,district,address").eq("owner_id",ownerId).maybeSingle(),
    supabase.from("profiles").select("id,is_verified").eq("id",ownerId).maybeSingle(),
    supabase.from("products").select("*").eq("vendor_id",ownerId).order("created_at",{ascending:false}).limit(24)
  ]).then(([storeResult,profileResult,productsResult])=>{
    if(!overlay.isConnected)return;
    if(storeResult.error)throw storeResult.error;
    if(profileResult.error)throw profileResult.error;
    const store=storeResult.data||cachedStore;
    const profile=profileResult.data||cachedProfile;
    const products=productsResult.error?[]:(productsResult.data||[]);
    const templateKey="zune_template_store:"+ownerId;
    let selectedTemplate="classic";
    try{selectedTemplate=localStorage.getItem(templateKey)||"classic";}catch(_){}
    const allowed=["classic","editorial","hero","compact","boutique","catalog","stories","minimal","deals","showcase"];
    const template=allowed.includes(selectedTemplate)?selectedTemplate:"classic";
    const sheet=overlay.querySelector(".z-storefront-sheet");
    sheet.setAttribute("data-zune-store-template",template);
    overlay.querySelector("#z-store-detail-name").textContent=store?.store_name||fallback;
    overlay.querySelector("#z-store-detail-location").textContent=[store?.district,store?.region,store?.address].filter(Boolean).join(", ");
    overlay.querySelector("#z-store-detail-status").innerHTML=badgeMarkup(store,profile);
    overlay.querySelector("#z-storefront-count").textContent=products.length+" "+(language()==="sw"?"bidhaa":"products");
    products.forEach(item=>{item.__zuneStore=store;item.__zuneOwnerProfile=profile;});
    overlay.querySelector("#z-storefront-products").innerHTML=products.length?products.map(productCard).join(""):"";
    const message=overlay.querySelector("#z-store-detail-message");
    if(productsResult.error)message.textContent=language()==="sw"?"Taarifa za duka zimepatikana, lakini bidhaa hazikuweza kupakiwa.":"Store details loaded, but products could not be loaded.";
    else if(!products.length)message.textContent=language()==="sw"?"Duka hili bado halijaweka bidhaa.":"This store has not listed any products yet.";
    else message.remove();
    overlay.querySelectorAll("[data-open-store]").forEach(button=>button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();openStoreDetails(button.dataset.openStore);}));
    overlay.querySelectorAll("[data-save-product]").forEach(button=>button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();toggleSaved(button.dataset.saveProduct);button.classList.toggle("is-saved");button.textContent=button.classList.contains("is-saved")?"♥":"♡";}));
    overlay.querySelectorAll("[data-open-product]").forEach(card=>card.addEventListener("click",event=>{if(event.target.closest("[data-save-product]"))return;const item=products.find(p=>String(p.id)===card.dataset.openProduct);if(item)openProductDetails(item);}));
  }).catch(error=>{
    console.warn("ZUNE storefront:",error);
    const message=overlay.querySelector("#z-store-detail-message");
    if(message)message.textContent=language()==="sw"?"Imeshindikana kupakia taarifa za duka. Tafadhali jaribu tena.":"Unable to load this storefront. Please try again.";
  });
}

function openProductDetails(product) {
  document.getElementById("z-product-detail-overlay")?.remove();
  const store = product.__zuneStore || null;
  const ownerProfile = product.__zuneOwnerProfile || null;
  const accountVerified = ownerProfile?.is_verified === true;
  const verified = store?.verification_status === "verified";
  const storeName = store?.store_name || product.store_name || product.seller_name || (language()==="sw"?"Muuzaji wa ZUNE":"ZUNE Seller");
  const location = [store?.district || product.district, store?.region || product.region, store?.address || product.location].filter(Boolean).slice(0,2).join(", ");
  const stock = product.stock_quantity == null ? null : Number(product.stock_quantity);
  const overlay = document.createElement("div");
  overlay.id = "z-product-detail-overlay";
  overlay.className = "z-product-detail-overlay";
  overlay.innerHTML = `
    <section class="z-product-detail-sheet" role="dialog" aria-modal="true" aria-label="${safe(product.title)}">
      <button type="button" class="z-detail-close" aria-label="Close">×</button>
      <div class="z-detail-image-wrap">${productImage(product)}</div>
      <div class="z-detail-content">
        <div class="z-product-store"><button type="button" class="z-product-store-name z-store-open" data-open-store="${safe(product.vendor_id||"")}">${safe(storeName)}</button>${accountVerified ? '<span class="z-verified-account-mark" title="Verified Account" aria-label="Verified Account"><svg viewBox="-30 -30 60 60" role="img"><g fill="#F28C28"><rect x="-22" y="-22" width="44" height="44" rx="6"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(30)"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(60)"/></g><path d="M-9 0 L-3 6 L10 -7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : ""}${verified ? '<span class="z-verified-store-mark" aria-label="Verified Store">✓</span>' : ""}</div>
        ${location ? `<div class="z-product-location">⌖ ${safe(location)}</div>` : ""}
        <h2>${safe(product.title || tx("emptyName"))}</h2>
        <p class="z-detail-price">${money(product.price)}</p>
        ${product.description ? `<p class="z-detail-description">${safe(product.description)}</p>` : ""}
        ${product.category ? `<p class="z-detail-category">${safe(product.category)}</p>` : ""}
        ${stock !== null ? `<p class="z-detail-stock">${stock > 0 ? (language()==="sw" ? "Stock iliyopo: " : "Available stock: ") + stock : (language()==="sw" ? "Bidhaa imeisha stock" : "Out of stock")}</p>` : ""}
        <button type="button" class="z-primary-button z-detail-add" ${stock !== null && stock <= 0 ? "disabled" : ""}>${tx("addCart")}</button>
      </div>
    </section>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  overlay.querySelector(".z-detail-close")?.addEventListener("click", close);
  overlay.querySelector("[data-open-store]")?.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();openStoreDetails(event.currentTarget.dataset.openStore,product);});
  overlay.querySelector(".z-detail-add")?.addEventListener("click", () => {
    addToCart(String(product.id));
    close();
  });
  const onKey = event => { if (event.key === "Escape") { close(); document.removeEventListener("keydown", onKey); } };
  document.addEventListener("keydown", onKey);
}

// --------------------------------------------
// 12. SAVE PRODUCT
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

  const savedKey = userStorageKey("zune_saved_products");
  if (savedKey) localStorage.setItem(savedKey, JSON.stringify(homeState.saved));

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

function bindProductCards(root){
  if(!root)return;
  root.querySelectorAll("[data-save-product]").forEach(button=>button.addEventListener("click",event=>{event.stopPropagation();toggleSaved(button.dataset.saveProduct);}));
  root.querySelectorAll("[data-open-store]").forEach(button=>button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();const id=button.dataset.openStore;const p=homeState.products.find(x=>String(x.vendor_id)===String(id))||homeState.sponsoredProducts.find(x=>String(x.product.vendor_id)===String(id))?.product;openStoreDetails(id,p||null);}));
  root.querySelectorAll("[data-open-product]").forEach(card=>{
    const open=()=>{const product=homeState.products.find(item=>String(item.id)===card.dataset.openProduct)||homeState.sponsoredProducts.find(item=>String(item.product.id)===card.dataset.openProduct)?.product;if(product)openProductDetails(product);};
    card.addEventListener("click",event=>{if(event.target.closest("[data-save-product]"))return;open();});
    card.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();open();}});
  });
}
function renderProductCards(products,gridClass="z-product-grid"){
 return products.length ? '<div class="'+gridClass+'">'+products.map(productCard).join("")+"</div>" : '<div class="z-empty-state"><strong>'+tx("empty")+"</strong></div>";
}
function updateProductArea() {
  const area=document.getElementById("z-product-area");
  if(area){
    const savedIds=new Set((homeState.saved||[]).map(String));
    const hybrid=[...homeState.products].sort((a,b)=>{
      const score=p=>Number(savedIds.has(String(p.id)))*-2+Number(String(p.category_id||"")===String(homeState.selectedCategory||"")&&homeState.selectedCategory?2:0)+Number(p.average_rating||p.rating_average||p.rating||0)*2+Number(p.sold_count||p.sales_count||p.total_sold||0)*.25;
      return score(b)-score(a);
    });
    area.innerHTML=renderProductCards(hybrid);
  }
  const arrivals=document.getElementById("z-new-arrivals");
  if(arrivals)arrivals.innerHTML=homeState.products.length?homeState.products.slice(0,6).map(productCard).join(""):'<div class="z-empty-state">'+tx("empty")+"</div>";
  const trending=document.getElementById("z-trending-products");
  if(trending){
    const ranked=[...homeState.products].sort((a,b)=>{
      const score=p=>Number(p.sold_count||p.sales_count||p.total_sold||0)*3+Number(p.average_rating||p.rating_average||p.rating||0)*2+Number(p.review_count||p.reviews_count||0)*.1;
      return score(b)-score(a);
    }).slice(0,8);
    trending.innerHTML=renderProductCards(ranked);
  }
  document.querySelectorAll(".z-home-content #z-product-area,.z-home-content #z-new-arrivals,.z-home-content #z-trending-products").forEach(bindProductCards);
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


const ZUNE_HOME_SLIDES = [
 {k:"ZUNE MARKETPLACE",sw:"Karibu sokoni kwetu",en:"Welcome to our marketplace",sd:"Gundua bidhaa mbalimbali kutoka kwa wauzaji.",ed:"Discover products from different sellers.",sc:"Gundua bidhaa",ec:"Explore products",a:"explore",img:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=85"},
 {k:"FURSA YA BIASHARA",sw:"Fungua duka lako ZUNE",en:"Open your store on ZUNE",sd:"Fikisha bidhaa zako kwa wateja wengi zaidi.",ed:"Bring your products to more customers.",sc:"Jiunge kama Seller",ec:"Become a Seller",a:"account",img:"https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1400&q=85"},
 {k:"MAKUNDI MBALIMBALI",sw:"Kila unachohitaji sehemu moja",en:"Everything in one place",sd:"Tembelea makundi na upate unachotafuta.",ed:"Browse categories and find what you need.",sc:"Angalia makundi",ec:"Browse categories",a:"categories",img:"https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=85"},
 {k:"UNUNUZI RAHISI",sw:"Pata bidhaa unazozipenda",en:"Find products you love",sd:"Tafuta na ugundue bidhaa sokoni.",ed:"Search and discover marketplace products.",sc:"Tafuta bidhaa",ec:"Find products",a:"search",img:"https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1400&q=85"},
 {k:"THAMANI BORA",sw:"Chagua kwa uhakika",en:"Shop with confidence",sd:"Linganisha bidhaa na uchague inayokufaa.",ed:"Compare products and choose what suits you.",sc:"Anza kuchunguza",ec:"Start exploring",a:"explore",img:"https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1400&q=85"},
 {k:"BIDHAA MPYA",sw:"Gundua bidhaa mpya",en:"Discover new arrivals",sd:"Angalia bidhaa mpya zinazoongezwa sokoni.",ed:"See the latest products added to ZUNE.",sc:"Tazama bidhaa",ec:"See products",a:"products",img:"https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1400&q=85"},
 {k:"JENGA BIASHARA",sw:"Panua biashara yako mtandaoni",en:"Grow your business online",sd:"Anza safari yako ya kuuza na ZUNE.",ed:"Start your selling journey with ZUNE.",sc:"Fungua akaunti",ec:"Get started",a:"account",img:"https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1400&q=85"},
 {k:"GUNDUA ZAIDI",sw:"Kuna mengi ya kugundua",en:"There is more to discover",sd:"Vinjari bidhaa kutoka makundi tofauti.",ed:"Explore products across different categories.",sc:"Gundua sasa",ec:"Discover now",a:"explore",img:"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=85"},
 {k:"ZUNE KWA WOTE",sw:"Nunua na uza kwa urahisi",en:"Buy and sell with ease",sd:"Soko linalowaunganisha wanunuzi na wauzaji.",ed:"A marketplace connecting buyers and sellers.",sc:"Tembelea soko",ec:"Visit marketplace",a:"products",img:"https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1400&q=85"},
 {k:"KARIBU ZUNE",sw:"Anza safari yako leo",en:"Start your journey today",sd:"Chunguza bidhaa na huduma mbalimbali.",ed:"Explore a wide range of products and services.",sc:"Endelea",ec:"Continue",a:"explore",img:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1400&q=85"},
];
function renderHomeCarousel(){
 const slide=ZUNE_HOME_SLIDES[homeState.carouselIndex%ZUNE_HOME_SLIDES.length],sw=language()==="sw";
 return `<section class="z-home-carousel" id="z-home-carousel" aria-label="ZUNE promotions">
 <img class="z-slide-image" src="${safe(slide.img)}" alt="" loading="eager">
 <div class="z-slide-copy"><span class="z-slide-kicker">${slide.k}</span><h2>${sw?slide.sw:slide.en}</h2><p>${sw?slide.sd:slide.ed}</p><button type="button" class="z-slide-cta" data-slide-action="${slide.a}">${sw?slide.sc:slide.ec} →</button></div>
 <div class="z-slide-controls"><div class="z-slide-dots">${ZUNE_HOME_SLIDES.map((x,i)=>`<button type="button" class="z-slide-dot ${i===homeState.carouselIndex?"active":""}" data-slide-index="${i}" aria-label="Slide ${i+1}"></button>`).join("")}</div>
 <div class="z-slide-arrows"><button type="button" class="z-slide-arrow" data-slide-prev aria-label="Previous slide">‹</button><button type="button" class="z-slide-arrow" data-slide-next aria-label="Next slide">›</button></div></div></section>`;
}
function moveHomeSlide(step){
 homeState.carouselIndex=(homeState.carouselIndex+step+ZUNE_HOME_SLIDES.length)%ZUNE_HOME_SLIDES.length;
 const old=document.getElementById("z-home-carousel");if(!old)return;
 const holder=document.createElement("div");holder.innerHTML=renderHomeCarousel();old.replaceWith(holder.firstElementChild);bindCarouselEvents();
}
function bindCarouselEvents(){
 const el=document.getElementById("z-home-carousel");if(!el)return;
 el.querySelector("[data-slide-prev]")?.addEventListener("click",()=>moveHomeSlide(-1));
 el.querySelector("[data-slide-next]")?.addEventListener("click",()=>moveHomeSlide(1));
 el.querySelectorAll("[data-slide-index]").forEach(dot=>dot.addEventListener("click",()=>{
  homeState.carouselIndex=Number(dot.dataset.slideIndex)||0;const old=document.getElementById("z-home-carousel");if(!old)return;
  const holder=document.createElement("div");holder.innerHTML=renderHomeCarousel();old.replaceWith(holder.firstElementChild);bindCarouselEvents();
 }));
 el.querySelector("[data-slide-action]")?.addEventListener("click",()=>{
  const a=el.querySelector("[data-slide-action]").dataset.slideAction;
  if(a==="account")window.location.assign("./account.html");
  else if(a==="categories")renderMarketplacePage("explore");
  else if(a==="stores")document.getElementById("z-featured-stores")?.scrollIntoView({behavior:"smooth"});
  else if(a==="search")document.getElementById("z-home-search")?.focus();
  else document.getElementById("z-product-area")?.scrollIntoView({behavior:"smooth",block:"start"});
 });
 let x=0;el.addEventListener("touchstart",e=>{x=e.changedTouches[0]?.clientX||0;},{passive:true});
 el.addEventListener("touchend",e=>{const d=(e.changedTouches[0]?.clientX||0)-x;if(Math.abs(d)>45)moveHomeSlide(d<0?1:-1);},{passive:true});
}
function startCarouselAutoplay(){if(homeState.carouselTimer)clearInterval(homeState.carouselTimer);homeState.carouselTimer=setInterval(()=>moveHomeSlide(1),5000);}

function renderFeaturedStores(){
 const stores=homeState.featuredStores||[];
 if(!stores.length)return `<div class="z-empty-state">${language()==="sw"?"Maduka yataonekana kadri bidhaa za wauzaji zinavyopakiwa.":"Stores will appear as seller products load."}</div>`;
 return stores.slice(0,10).map(store=>`<article class="z-featured-store"><strong>${safe(store.store_name||"ZUNE Store")} ${store.verification_status==="verified"?`<span class="store-verified" title="Verified Store">✓</span>`:""}</strong><small>${safe([store.district,store.region].filter(Boolean).join(", ")|| (language()==="sw"?"Duka la ZUNE":"ZUNE Store"))}</small></article>`).join("");
}

// --------------------------------------------
// 17. RENDER CATEGORIES
// --------------------------------------------

function renderCategories() {
  const categories = homeState.categories || [];

  return `
    <div class="z-category-directory">
      ${categories.slice(0,8).map(category => `
        <button type="button" class="z-category ${String(homeState.selectedCategory)===String(category.id)?"active":""}" data-category="${safe(category.id)}">${safe(category.name)}</button>
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
              data-open-cart
              aria-label="${tx("cart")}"
            >
              ${zIcon("cart")}
              <span class="z-cart-badge" data-cart-count hidden>0</span>
            </button>

            <button
              type="button"
              class="z-icon-button"
              data-open-account
              aria-label="${tx("me")}"
            >
              ${zIcon("account")}
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
            aria-controls="z-search-suggestions"
            aria-expanded="false"
          >
          <div class="z-search-suggestions" id="z-search-suggestions" role="listbox"></div>
        </label>

      </header>

      <main class="z-home-content">

        ${renderHomeCarousel()}

        <section>

          <div class="z-section-heading">
            <h2>${tx("categories")}</h2>
            <button type="button" class="z-all-categories" data-open-categories>${tx("allCategories")} →</button>
          </div>

          <div id="z-category-area">
            ${renderCategories()}
          </div>

        </section>

        <section id="z-featured-stores-section">
          <div class="z-section-heading"><h2>${language()==="sw"?"Maduka Maarufu":"Featured Stores"}</h2></div>
          <div class="z-featured-stores" id="z-featured-stores">${renderFeaturedStores()}</div>
        </section>

        <section id="z-sponsored-stores-section"><div class="z-section-heading"><h2>${language()==="sw"?"Maduka Yaliyodhaminiwa":"Sponsored Stores"}</h2></div><div id="z-sponsored-stores" class="z-sponsored-stores"></div></section>

        <section id="z-sponsored-products-section">
          <div class="z-section-heading"><h2>${language()==="sw"?"Bidhaa Zilizodhaminiwa":"Sponsored Products"}</h2><span class="z-sponsored-note">${language()==="sw"?"Matangazo":"Ads"}</span></div>
          <div class="z-sponsored-products" id="z-sponsored-products"><div class="z-sponsored-empty">${language()==="sw"?"Inapakia matangazo…":"Loading sponsored products…"}</div></div>
        </section>

        <section>
          <div class="z-section-heading"><h2>${language()==="sw"?"Bidhaa Mpya":"New Arrivals"}</h2><button type="button" class="z-all-categories" data-view-all-products>${language()==="sw"?"Zote":"View All"} →</button></div>
          <div id="z-new-arrivals" class="z-product-row">${homeState.products.slice(0,6).map(productCard).join("")}</div>
        </section>
        <section>
          <div class="z-section-heading"><h2>Trending Products</h2></div>
          <div id="z-trending-products" class="z-product-grid"></div>
        </section>
        <section>
          <div class="z-section-heading"><h2>${language()==="sw"?"Smart Hybrid — Imependekezwa kwako":"Smart Hybrid — Recommended for You"}</h2></div>
          <div id="z-product-area">${homeState.products.length?`<div class="z-product-grid">${homeState.products.map(productCard).join("")}</div>`:""}</div>
          <div class="z-load-status" id="z-load-status"></div><div id="z-scroll-trigger"></div>
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

  const suggestionBox=document.getElementById("z-search-suggestions");
  const renderSuggestions=()=>{
    if(!suggestionBox)return;
    const q=input.value.trim().toLowerCase();
    if(!q){suggestionBox.classList.remove("open");input.setAttribute("aria-expanded","false");return;}
    const matches=homeState.products.filter(p=>String(p.title||"").toLowerCase().includes(q)).slice(0,6);
    const storeMatches=homeState.featuredStores.filter(st=>String(st.store_name||"").toLowerCase().includes(q)).slice(0,3);
    const rows=[...matches.map(p=>`<button type="button" class="z-search-suggestion" data-suggest-product="${safe(p.id)}">⌕ <span>${safe(p.title)}<small>${money(p.price)}</small></span></button>`),...storeMatches.map(st=>`<button type="button" class="z-search-suggestion" data-suggest-store="${safe(st.owner_id)}">▣ <span>${safe(st.store_name)}<small>${language()==="sw"?"Duka":"Store"}</small></span></button>` )];
    suggestionBox.innerHTML=rows.length?rows.join(""):`<div class="z-search-suggestion">${language()==="sw"?"Endelea kuandika kutafuta bidhaa zaidi":"Keep typing to search more products"}</div>`;
    suggestionBox.classList.add("open");input.setAttribute("aria-expanded","true");
  };
  input.addEventListener("input", () => {
    renderSuggestions();clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      homeState.search = input.value.trim();homeState.selectedVendor="";homeState.products = [];homeState.page = 0;homeState.hasMore = true;
      await loadProducts(true);renderSuggestions();
    }, 350);
  });
  suggestionBox?.addEventListener("click",event=>{
    const productButton=event.target.closest("[data-suggest-product]");
    if(productButton){const product=homeState.products.find(p=>String(p.id)===productButton.dataset.suggestProduct);if(product)openProductDetails(product);suggestionBox.classList.remove("open");return;}
    const storeButton=event.target.closest("[data-suggest-store]");if(storeButton){suggestionBox.classList.remove("open");document.getElementById("z-featured-stores-section")?.scrollIntoView({behavior:"smooth"});}
  });
  input.addEventListener("keydown",event=>{if(event.key==="Escape"){suggestionBox?.classList.remove("open");input.setAttribute("aria-expanded","false");}});
}

// --------------------------------------------
// 21. HOME EVENTS
// --------------------------------------------

function bindHomeEvents() {
  bindCategoryEvents();
  bindSearchEvents();
  bindCarouselEvents();
  startCarouselAutoplay();
  document.querySelector("[data-open-categories]")?.addEventListener("click", () => renderMarketplacePage("categories"));
  document.querySelector("[data-view-all-products]")?.addEventListener("click",()=>renderMarketplacePage("explore"));

  document.querySelector("[data-open-cart]")
    ?.addEventListener("click", () => {
      renderMarketplacePage("cart");
    });

  document.querySelector("[data-open-account]")
    ?.addEventListener("click", () => {
      renderMarketplacePage("me");
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

      // Account is a dedicated standalone page.
      if (page === "me") {
        window.location.assign("./account.html");
        return;
      }

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

function renderCategoriesPage() {
  const categories = homeState.categories || [];
  return `
    <section class="z-home">
      <header class="z-home-header">
        <div class="z-home-top">
          <div class="zune-logo">ⓏⓊⓃⒺ</div>
          <button type="button" class="z-all-categories" data-back-home>← ${tx("home")}</button>
        </div>
      </header>
      <main class="z-home-content">
        <h1 class="z-page-title">${tx("categories")}</h1>
        <div class="z-categories-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px">
          <button type="button" class="z-category" data-category-page="" style="min-height:76px;border-radius:14px;white-space:normal">${tx("all")}</button>
          ${categories.map(category => `
            <button type="button" class="z-category" data-category-page="${safe(category.id)}" style="min-height:76px;border-radius:14px;white-space:normal">${safe(category.name)}</button>
          `).join("")}
        </div>
        ${categories.length ? "" : `<div class="z-empty-state" style="margin-top:14px">${tx("empty")}</div>`}
      </main>
    </section>
  `;
}

function bindCategoriesPage() {
  document.querySelectorAll("[data-category-page]").forEach(button => {
    button.addEventListener("click", async () => {
      homeState.selectedCategory = button.dataset.categoryPage || "";
      homeState.selectedVendor = "";
      homeState.search = "";
      homeState.page = 0;
      homeState.products = [];
      homeState.hasMore = true;
      renderMarketplacePage("explore");
      await loadProducts(true);
    });
  });
  document.querySelector("[data-back-home]")?.addEventListener("click", () => {
    renderMarketplacePage("home");
  });
}

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
        <section><div class="z-section-heading"><h2>${tx("categories")}</h2></div>
          <div id="z-explore-category-area" class="z-category-directory">
            ${(homeState.categories || []).map(category => `<button type="button" class="z-category ${String(homeState.selectedCategory)===String(category.id)?"active":""}" data-category="${safe(category.id)}">${safe(category.name)}</button>`).join("")}
          </div>
        </section>

        <section id="z-explore-sponsored-section"><div class="z-section-heading"><h2>${language()==="sw"?"Matangazo Yanayokufaa":"Sponsored for You"}</h2></div><div id="z-explore-sponsored-products" class="z-sponsored-products"></div></section>

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
  const categoryArea=document.getElementById("z-explore-category-area");
  categoryArea?.querySelectorAll("[data-category]").forEach(button=>button.addEventListener("click",async()=>{
    homeState.selectedCategory=button.dataset.category||"";homeState.selectedVendor="";
    homeState.products=[];homeState.page=0;homeState.hasMore=true;
    categoryArea.innerHTML=(homeState.categories||[]).map(category=>`<button type="button" class="z-category ${String(homeState.selectedCategory)===String(category.id)?"active":""}" data-category="${safe(category.id)}">${safe(category.name)}</button>`).join("");
    bindExploreEvents();await loadProducts(true);
  }));
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
  return renderCartView({
    cart: homeState.cart,
    products: homeState.cartProducts,
    language: language(),
    loading: homeState.cartProductsLoading,
    error: homeState.cartProductsError
  });
}

function bindCartEvents() {
  bindCartViewEvents(document, {
    onQuantityChange: (productId, change) => {
      changeCartQuantity(productId, change);
      renderMarketplacePage("cart");
    },
    onRemove: productId => {
      removeCartItem(productId);
      renderMarketplacePage("cart");
    },
    onContinueShopping: () => renderMarketplacePage("home"),
    onCheckout: () => alert(tx("checkoutComingSoon"))
  });

  const key = homeState.cart.map(item => String(item.productId)).sort().join("|");
  if (key === homeState.cartProductsKey || homeState.cartProductsLoading) return;

  homeState.cartProductsLoading = true;
  homeState.cartProductsError = false;
  loadCartProducts(homeState.cart).then(products => {
    homeState.cartProducts = products;
    homeState.cartProductsKey = key;
  }).catch(error => {
    console.error("ZUNE cart products error:", error);
    homeState.cartProductsError = true;
    homeState.cartProductsKey = key;
  }).finally(() => {
    homeState.cartProductsLoading = false;
    if (homeState.activeTab === "cart") renderMarketplacePage("cart");
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
    <label>${label("Namba ya TIN (si lazima)","TIN number (optional)")}<input name="tin_number" maxlength="80" autocomplete="off" placeholder="${label("Unaweza kuacha wazi","You may leave this blank")}"></label>
    <p class="z-account-message">${label("TIN si sharti. Unaweza kutuma maombi ya kuwa Seller hata kama huna TIN.","TIN is not required. You can submit your Seller application even if you do not have a TIN.")}</p>
    <button type="submit" class="z-primary-button" id="z-seller-submit">${label("Tuma maombi","Submit application")}</button>
    <p class="z-account-message" id="z-seller-form-message" aria-live="polite"></p>
  </form>`;
}

const ZUNE_THEMES = [
  { id: "emerald", sw: "Emerald", en: "Emerald Green", color: "#087A55" },
  { id: "luxury", sw: "Luxury Dark", en: "Luxury Dark", color: "#C69B36" },
  { id: "ocean", sw: "Ocean Blue", en: "Ocean Blue", color: "#1676C5" },
  { id: "royal", sw: "Royal Purple", en: "Royal Purple", color: "#7546B8" },
  { id: "nature", sw: "Nature", en: "Nature", color: "#426B3D" },
  { id: "blossom", sw: "Blossom Pink", en: "Blossom Pink", color: "#D94F83" },
  { id: "sunset", sw: "Sunset", en: "Sunset", color: "#D65B3C" },
  { id: "minimal", sw: "Minimal Light", en: "Minimal Light", color: "#424B57" }
];

function applyZuneTheme(themeId) {
  const valid = ZUNE_THEMES.some(theme => theme.id === themeId);
  const selected = valid ? themeId : "emerald";
  document.documentElement.setAttribute("data-theme", selected);
  try { localStorage.setItem("zune_theme", selected); } catch (error) {
    console.warn("ZUNE theme preference could not be saved:", error);
  }
}

function renderThemeSettings() {
  const sw = language() === "sw";
  const selected = localStorage.getItem("zune_theme") || "emerald";
  return `<section class="z-seller-panel z-theme-panel">
    <h2>${sw ? "Muonekano wa ZUNE" : "ZUNE Appearance"}</h2>
    <p>${sw ? "Chagua rangi na muonekano unaoupenda. Chaguo lako litahifadhiwa kwenye kifaa hiki." : "Choose the colors and appearance you prefer. Your choice will be saved on this device."}</p>
    <div class="z-theme-grid">
      ${ZUNE_THEMES.map(theme => `<button type="button" class="z-theme-option ${selected === theme.id ? "active" : ""}" data-zune-theme="${theme.id}" aria-pressed="${selected === theme.id}">
        <span class="z-theme-swatch" style="--theme-swatch:${theme.color}"></span>
        <span>${sw ? theme.sw : theme.en}</span>
        <span class="z-theme-check">${selected === theme.id ? "✓" : ""}</span>
      </button>`).join("")}
    </div>
  </section>`;
}

function renderAccountPage() {
  const user = homeState.user;
  const sw = language() === "sw";
  const label = (a,b) => sw ? a : b;
  const email = user?.email || "";
  const name = homeState.accountProfile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || email.split("@")[0] || "ZUNE Customer";
  const role = homeState.accountProfile?.role || "buyer";
  const isSeller = role === "vendor";
  const application = homeState.sellerApplication;
  const initials = name.trim().split(/\s+/).slice(0,2).map(part => part.charAt(0)).join("").toUpperCase();
  let sellerContent = "";
  if (isSeller) {
    sellerContent = `<section class="z-account-seller z-account-section"><span class="z-account-eyebrow">${label("BIASHARA YANGU","MY BUSINESS")}</span><h2>${label("Duka lako liko tayari","Your store is ready")}</h2><p>${label("Maombi yako yameidhinishwa.","Your application is approved.")}</p><div class="z-seller-status approved"><strong>✓ ${label("Umeidhinishwa","Approved")}</strong><span>${label("Sasa unaweza kusimamia duka lako kupitia dashboard.","Manage your store from the dashboard.")}</span></div><button type="button" class="z-primary-button" data-open-seller-dashboard>${label("Fungua Seller Dashboard","Open Seller Dashboard")} →</button></section>`;
  } else if (application) {
    const status = String(application.status || "pending").toLowerCase();
    let title = label("Maombi yametumwa","Application submitted");
    let detail = label("Maombi yako yanasubiri kupitia Admin Mkuu.","Your application is awaiting Admin Mkuu review.");
    let statusClass = "pending";
    if (status === "approved") { title = label("Maombi yameidhinishwa","Application approved"); detail = label("Akaunti yako inasubiri kusasishwa kuwa muuzaji.","Your account is awaiting seller-role update."); statusClass = "approved"; }
    if (status === "rejected") { title = label("Maombi yamekataliwa","Application rejected"); detail = application.admin_note || label("Wasiliana na msaada kwa maelezo zaidi.","Contact support for more information."); statusClass = "rejected"; }
    if (["more_info_required","needs_information","more_information"].includes(status)) { title = label("Tunahitaji maelezo zaidi","More information required"); detail = application.admin_note || label("Tafadhali wasiliana na msaada.","Please contact support."); statusClass = "review"; }
    sellerContent = `<section class="z-account-seller z-account-section"><span class="z-account-eyebrow">${label("OMBI LA MUUZAJI","SELLER APPLICATION")}</span><h2>${title}</h2><p>${safe(detail)}</p><div class="z-seller-status ${statusClass}"><strong>${label("Hali ya maombi","Application status")}: ${safe(status.replace(/_/g," "))}</strong></div>${status === "rejected" ? renderSellerApplicationForm() : ""}</section>`;
  } else {
    sellerContent = `<section class="z-account-seller z-account-section"><span class="z-account-eyebrow">${label("BIASHARA YANGU","MY BUSINESS")}</span><h2>${label("Fungua duka lako ZUNE","Open your ZUNE store")}</h2><p>${label("Omba kuwa Seller na uanze kuuza bidhaa zako kwenye Marketplace.","Apply to become a Seller and start selling on ZUNE Marketplace.")}</p>${renderSellerApplicationForm()}</section>`;
  }
  let customerVerificationContent = "";
  if (role === "buyer") {
    const request = homeState.customerVerificationRequest;
    const requestStatus = String(request?.status || "").toLowerCase();
    const customerVerified = homeState.accountProfile?.is_verified === true;
    let statusMarkup = "";
    if (customerVerified) {
      statusMarkup = `<div class="z-seller-status approved"><strong>✓ Verified Account</strong><span>${label("Akaunti yako ya mteja imethibitishwa.","Your customer account is verified.")}</span></div>`;
    } else if (requestStatus === "pending") {
      statusMarkup = `<div class="z-seller-status pending"><strong>${label("Ombi linasubiri ukaguzi","Request pending review")}</strong><span>${label("Admin Mkuu atakagua ombi lako.","Admin Mkuu will review your request.")}</span></div>`;
    } else if (requestStatus === "rejected") {
      statusMarkup = `<div class="z-seller-status rejected"><strong>${label("Ombi limekataliwa","Request rejected")}</strong><span>${safe(request.rejection_reason || label("Unaweza kutuma ombi jipya.","You may submit a new request."))}</span></div>`;
    } else if (["more_info_required","needs_information","more_information"].includes(requestStatus)) {
      statusMarkup = `<div class="z-seller-status review"><strong>${label("Taarifa zaidi zinahitajika","More information required")}</strong><span>${safe(request.rejection_reason || label("Sasisha taarifa zako kisha tuma tena.","Update your details and submit again."))}</span></div>`;
    }
    customerVerificationContent = `<section class="z-account-seller z-account-section z-account-verification"><span class="z-account-eyebrow">${label("CUSTOMER VERIFICATION","CUSTOMER VERIFICATION")}</span><h2>${label("Uthibitisho wa mteja","Customer verification")}</h2><p>${label("Omba Verified Account. Beji ya orange itaonekana baada ya Admin Mkuu kuidhinisha ombi lako.","Request Verified Account. The orange badge appears after Admin Mkuu approves your request.")}</p>${statusMarkup}${customerVerified || (requestStatus === "pending" && request?.document_path) ? "" : `<form id="z-customer-verification-form" class="z-seller-form"><label>${label("Jina lako kamili","Your full name")}<input name="full_name" maxlength="140" required value="${safe(name)}"></label><label>${label("Picha ya kitambulisho (mbele)","Identity document image (front)")}<input name="identity_document" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required></label><p class="z-account-message">${label("JPG, PNG, WEBP au PDF. Ukubwa usizidi MB 10. Picha itaonekana kwa Admin Mkuu pekee.","JPG, PNG, WEBP or PDF. Maximum 10 MB. Only Admin Mkuu can view this document.")}</p><button type="submit" class="z-primary-button" id="z-customer-verification-submit">${label("Omba Verified Account","Apply for Verified Account")}</button><p class="z-account-message" id="z-customer-verification-message" role="status"></p></form>`}</section>`;
  }

  return `<section class="z-home z-account-page"><main class="z-home-content">
    <div class="z-account-heading"><div><span class="z-account-eyebrow">${label("NAFASI YAKO","YOUR SPACE")}</span><h1 class="z-page-title">${label("Akaunti yangu","My account")}</h1></div><span class="z-account-heading-mark">ⓏⓊⓃⒺ</span></div>
    <section class="z-account-hero" data-account-profile role="button" tabindex="0" aria-label="${label("Fungua taarifa binafsi","Open personal information")}">${homeState.accountProfile?.avatar_display_url ? `<img class="z-account-avatar" src="${safe(homeState.accountProfile.avatar_display_url)}" alt="Profile photo">` : `<div class="z-account-avatar">${safe(initials || "Z")}</div>`}<div class="z-account-identity"><span class="z-account-eyebrow">${label("KARIBU TENA","WELCOME BACK")}</span><h2>${safe(name)}</h2><p>${safe(email)}</p>${role === "buyer" && homeState.accountProfile?.is_verified ? `<span class="z-account-verified"><svg viewBox="-30 -30 60 60" role="img" aria-label="Verified Account"><g fill="#F28C28"><rect x="-22" y="-22" width="44" height="44" rx="6"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(30)"/><rect x="-22" y="-22" width="44" height="44" rx="6" transform="rotate(60)"/></g><path d="M-9 0 L-3 6 L10 -7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Verified Account</span></span>` : ""}</div><span class="z-account-role ${isSeller ? "vendor" : ""}">${isSeller ? label("MUUZAJI","SELLER") : label("MTEJA","CUSTOMER")}</span></section>
    ${homeState.accountLoading ? `<p class="z-account-message">${label("Inapakia taarifa za akaunti...","Loading account details...")}</p>` : ""}
    ${homeState.accountError ? `<p class="z-account-message" role="alert">${safe(homeState.accountError)}</p>` : ""}
    <section class="z-account-section"><div class="z-account-section-heading"><div><span class="z-account-eyebrow">${label("SHUGHULI ZA MANUNUZI","SHOPPING ACTIVITY")}</span><h2>${label("Manunuzi yangu","My shopping")}</h2></div></div><div class="z-account-shortcuts">
      <button type="button" class="z-account-shortcut" data-account-orders><span class="shortcut-icon">▤</span><span><strong>${label("Oda zangu","My orders")}</strong><small>${label("Angalia na fuatilia oda zako","View and track your orders")}</small></span><b>›</b></button>
      <button type="button" class="z-account-shortcut" data-account-saved><span class="shortcut-icon saved">♡</span><span><strong>${label("Zilizohifadhiwa","Saved items")}</strong><small>${label("Bidhaa ulizopenda","Your favourites")}</small></span><b>›</b></button>
      <button type="button" class="z-account-shortcut" data-account-cart><span class="shortcut-icon">🛒</span><span><strong>${label("Kikapu changu","My cart")}</strong><small>${label("Bidhaa ulizochagua","Items you selected")}</small></span><b>›</b></button>
    </div></section>
    ${customerVerificationContent}
    ${sellerContent}
    ${renderThemeSettings()}
    <section class="z-account-section"><div class="z-account-section-heading"><div><span class="z-account-eyebrow">${label("AKAUNTI NA USALAMA","ACCOUNT & SECURITY")}</span><h2>${label("Mipangilio ya akaunti","Account settings")}</h2></div></div>
      <button type="button" class="z-account-menu-row" data-open-settings="personal"><span class="shortcut-icon">👤</span><span><strong>${label("Taarifa binafsi","Personal information")}</strong><small>${label("Jina, picha na taarifa zako","Name, photo and your details")}</small></span><b>›</b></button>
      <button type="button" class="z-account-menu-row" data-open-settings="security"><span class="shortcut-icon">🔐</span><span><strong>${label("Usalama na nenosiri","Security & password")}</strong><small>${label("Linda akaunti yako","Keep your account secure")}</small></span><b>›</b></button>
      <button type="button" class="z-account-menu-row" data-open-settings="notifications"><span class="shortcut-icon">🔔</span><span><strong>${label("Taarifa na arifa","Notifications")}</strong><small>${label("Simamia taarifa za akaunti","Manage account notifications")}</small></span><b>›</b></button>
      <button type="button" class="z-account-menu-row" data-open-settings="contact"><span class="shortcut-icon">❔</span><span><strong>${label("Msaada na huduma kwa wateja","Help & support")}</strong><small>${label("Wasiliana na timu ya ZUNE","Contact the ZUNE team")}</small></span><b>›</b></button>
    </section>
    <button type="button" class="z-account-logout" id="z-logout-button">↪ ${tx("logout")}</button><p class="z-account-version">ⓏⓊⓃⒺ MARKETPLACE · 2.0</p>
  </main></section>`;
}
async function loadAccountDetails() {
  const user = homeState.user;
  if (!user?.id || homeState.accountLoadedFor === user.id || homeState.accountLoading) return;
  homeState.accountLoading = true;
  homeState.accountError = "";
  try {
    const [profile, application, verification] = await Promise.all([
      supabase.from("profiles").select("id,full_name,role,is_verified,avatar_path").eq("id",user.id).maybeSingle(),
      supabase.from("seller_applications").select("id,store_name,status,admin_note,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("verified_badge_requests").select("id,status,rejection_reason,document_path,created_at").eq("user_id",user.id).eq("verification_type","customer").order("created_at",{ascending:false}).limit(1).maybeSingle()
    ]);
    if (profile.error) throw profile.error;
    if (application.error) throw application.error;
    if (verification.error) throw verification.error;
    homeState.accountProfile = profile.data || null;
    if (homeState.accountProfile?.avatar_path) { const {data:avatarBlob,error:avatarError}=await supabase.storage.from("zune-avatars").download(homeState.accountProfile.avatar_path); if (!avatarError && avatarBlob) homeState.accountProfile.avatar_display_url=URL.createObjectURL(avatarBlob); }
    homeState.sellerApplication = application.data || null;
    homeState.customerVerificationRequest = verification.data || null;
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


function navigateWithZuneWave(destination) {
  if (homeState.accountNavigating) return;
  homeState.accountNavigating = true;
  const overlay = document.createElement("div");
  overlay.className = "zune-wave-transition active";
  overlay.setAttribute("role","status");
  overlay.setAttribute("aria-label",language()==="sw"?"Inafungua ukurasa":"Opening page");
  overlay.innerHTML = '<div class="zune-wave-wordmark" aria-hidden="true"><span style="--letter-index:0">Ⓩ</span><span style="--letter-index:1">Ⓤ</span><span style="--letter-index:2">Ⓝ</span><span style="--letter-index:3">Ⓔ</span></div><div class="zune-wave-caption">ZUNE MARKETPLACE</div>';
  document.body.appendChild(overlay);
  window.setTimeout(() => {
    try { destination(); }
    finally { overlay.remove(); homeState.accountNavigating = false; }
  }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 180 : 850);
}

function bindAccountEvents() {
  document.querySelectorAll("[data-zune-theme]").forEach(button => {
    button.addEventListener("click", () => {
      applyZuneTheme(button.dataset.zuneTheme);
      document.querySelectorAll("[data-zune-theme]").forEach(option => {
        const active = option.dataset.zuneTheme === button.dataset.zuneTheme;
        option.classList.toggle("active", active);
        option.setAttribute("aria-pressed", String(active));
        const check = option.querySelector(".z-theme-check");
        if (check) check.textContent = active ? "✓" : "";
      });
    });
  });
  document.querySelector("[data-open-seller-dashboard]")?.addEventListener("click",()=>navigateWithZuneWave(()=>window.location.assign("./seller-dashboard.html")));
  document.querySelector("[data-account-profile]")?.addEventListener("click",()=>navigateWithZuneWave(()=>window.location.assign("./settings.html?section=personal")));
  document.querySelector("[data-account-profile]")?.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();navigateWithZuneWave(()=>window.location.assign("./settings.html?section=personal"));}});
  document.querySelectorAll("[data-open-settings]").forEach(button=>button.addEventListener("click",()=>navigateWithZuneWave(()=>window.location.assign("./settings.html?section="+encodeURIComponent(button.dataset.openSettings||"personal")))));
  document.querySelector("[data-account-orders]")?.addEventListener("click",()=>navigateWithZuneWave(()=>{const app=homeState.app;app.innerHTML=`<section class="z-home z-account-page"><main class="z-home-content"><button type="button" class="z-primary-button" id="z-orders-back">← ${language()==="sw"?"Rudi Akaunti":"Back to Account"}</button><h1 class="z-page-title">${language()==="sw"?"Oda zangu":"My Orders"}</h1><section class="z-account-section"><p>${language()==="sw"?"Oda zako zitaonekana hapa baada ya kufanya manunuzi.":"Your orders will appear here after you make a purchase."}</p></section></main></section>`;document.getElementById("z-orders-back")?.addEventListener("click",()=>renderMarketplacePage("me"));}));
  document.querySelector("[data-account-saved]")?.addEventListener("click",()=>navigateWithZuneWave(()=>renderMarketplacePage("saved")));
  document.querySelector("[data-account-cart]")?.addEventListener("click",()=>navigateWithZuneWave(()=>renderMarketplacePage("cart")));
  document.getElementById("z-logout-button")?.addEventListener("click",async()=>{
    if (typeof homeState.onLogout === "function") { await homeState.onLogout(); return; }
    const {error} = await supabase.auth.signOut(); if (error) alert(error.message);
  });
  document.getElementById("z-customer-verification-form")?.addEventListener("submit",async event=>{
    event.preventDefault();
    const user = homeState.user;
    const form = event.currentTarget;
    const message = document.getElementById("z-customer-verification-message");
    const submit = document.getElementById("z-customer-verification-submit");
    const formData = new FormData(form);
    const full_name = String(formData.get("full_name") || "").trim();
    const documentFile = formData.get("identity_document");
    if (!user?.id || homeState.accountProfile?.role !== "buyer") {
      if (message) message.textContent = language()==="sw" ? "Verification hii inapatikana kwa akaunti za Customer pekee." : "This verification is only available to customer accounts.";
      return;
    }
    if (full_name.length < 3 || !(documentFile instanceof File) || !documentFile.size) {
      if (message) message.textContent = language()==="sw" ? "Weka jina lako kamili." : "Enter your full name.";
      return;
    }
    if (documentFile.size > 10*1024*1024 || !["image/jpeg","image/png","image/webp","application/pdf"].includes(documentFile.type)) { if(message) message.textContent=language()==="sw"?"Chagua JPG, PNG, WEBP au PDF isiyozidi MB 10.":"Choose JPG, PNG, WEBP or PDF up to 10 MB."; return; }
    if (submit) { submit.disabled = true; submit.textContent = language()==="sw" ? "Inatuma ombi..." : "Submitting..."; }
    if (message) message.textContent = "";
    try {
      const extension = documentFile.type === "application/pdf" ? "pdf" : documentFile.type.split("/")[1].replace("jpeg","jpg");
      const documentPath = user.id + "/customer/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + extension;
      const upload = await supabase.storage.from("zune-verification-documents").upload(documentPath, documentFile, {contentType:documentFile.type,upsert:false});
      if (upload.error) throw upload.error;
      if (homeState.customerVerificationRequest?.status === "pending" && !homeState.customerVerificationRequest.document_path) {
        const {data,error}=await supabase.rpc("zune_attach_verification_document",{p_request_id:homeState.customerVerificationRequest.id,p_document_path:documentPath});
        if(error)throw error;
        homeState.customerVerificationRequest=data;
        renderMarketplacePage("me");
        return;
      }
      const { data, error } = await supabase.from("verified_badge_requests").insert({
        user_id: user.id, full_name, business_name: null, verification_type: "customer", document_path: documentPath, status: "pending"
      }).select("id,status,rejection_reason,document_path,created_at").single();
      if (error) throw error;
      homeState.customerVerificationRequest = data;
      renderMarketplacePage("me");
    } catch (error) {
      console.error("ZUNE customer verification:", error);
      if (message) message.textContent = error.message || (language()==="sw" ? "Imeshindikana kutuma ombi. Jaribu tena." : "Could not submit request. Please try again.");
      if (submit) { submit.disabled = false; submit.textContent = language()==="sw" ? "Omba Verified Account" : "Apply for Verified Account"; }
    }
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


/* Apply the signed-in customer's selected template to the live Marketplace UI. */
function applyMarketplaceTemplate() {
  const id = homeState.user?.id;
  let selected = "classic";
  try { if (id) selected = localStorage.getItem("zune_template_customer:" + id) || "classic"; } catch (_) {}
  const allowed = ["classic","editorial","hero","compact","boutique","catalog","stories","minimal","deals","showcase"];
  const template = allowed.includes(selected) ? selected : "classic";
  const marketplace = homeState.app?.querySelector(".z-marketplace");
  if (marketplace) marketplace.setAttribute("data-zune-template", template);
  if (document.getElementById("zuneMarketplaceTemplateStyles")) return;
  const style = document.createElement("style");
  style.id = "zuneMarketplaceTemplateStyles";
  style.textContent = `
    .z-marketplace[data-zune-template="editorial"] .z-home-content{max-width:1240px}.z-marketplace[data-zune-template="editorial"] .z-home-carousel{border-radius:4px;min-height:285px}.z-marketplace[data-zune-template="editorial"] .z-section-heading h2{font-family:Georgia,serif;font-size:20px}.z-marketplace[data-zune-template="editorial"] .z-product-grid{gap:18px}.z-marketplace[data-zune-template="editorial"] .z-product-card{border-radius:5px;box-shadow:none}.z-marketplace[data-zune-template="editorial"] .z-product-media{aspect-ratio:1/1}
    .z-marketplace[data-zune-template="hero"] .z-home-content{max-width:1180px}.z-marketplace[data-zune-template="hero"] .z-home-carousel,.z-marketplace[data-zune-template="hero"] .z-slide-copy{min-height:340px}.z-marketplace[data-zune-template="hero"] .z-home-carousel{border-radius:26px}.z-marketplace[data-zune-template="hero"] .z-home-welcome{display:none}
    .z-marketplace[data-zune-template="compact"] .z-home-header{padding:8px 12px}.z-marketplace[data-zune-template="compact"] .z-home-top{margin-bottom:8px}.z-marketplace[data-zune-template="compact"] .z-icon-button{width:35px;height:35px;border-radius:10px}.z-marketplace[data-zune-template="compact"] .z-search-box{min-height:40px}.z-marketplace[data-zune-template="compact"] .z-home-content{padding:10px}.z-marketplace[data-zune-template="compact"] .z-home-carousel,.z-marketplace[data-zune-template="compact"] .z-slide-copy{min-height:150px}.z-marketplace[data-zune-template="compact"] .z-product-grid{gap:7px}.z-marketplace[data-zune-template="compact"] .z-product-card{border-radius:10px}.z-marketplace[data-zune-template="compact"] .z-product-media{aspect-ratio:1/1}
    .z-marketplace[data-zune-template="boutique"] .z-home-header{background:#28211f;color:#fff;border:0}.z-marketplace[data-zune-template="boutique"] .z-home-header .z-icon-button{background:#3a302d;color:#fff;border-color:#51443f}.z-marketplace[data-zune-template="boutique"] .zune-logo{color:#e5c6a8}.z-marketplace[data-zune-template="boutique"] .z-home-carousel{border-radius:30px 5px 30px 5px}.z-marketplace[data-zune-template="boutique"] .z-product-card{border-radius:4px;box-shadow:none}.z-marketplace[data-zune-template="boutique"] .z-product-media{aspect-ratio:4/5}
    .z-marketplace[data-zune-template="catalog"] .z-home-content{max-width:1300px}.z-marketplace[data-zune-template="catalog"] .z-category-directory{grid-template-columns:repeat(4,minmax(0,1fr))}.z-marketplace[data-zune-template="catalog"] .z-product-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.z-marketplace[data-zune-template="catalog"] .z-product-card{border-radius:9px}.z-marketplace[data-zune-template="catalog"] .z-product-media{aspect-ratio:1/1}
    .z-marketplace[data-zune-template="stories"] .z-home-carousel{border-radius:26px 26px 8px 8px}.z-marketplace[data-zune-template="stories"] .z-category-directory .z-category{min-height:70px;border-radius:18px;white-space:normal}.z-marketplace[data-zune-template="stories"] .z-product-row{grid-auto-columns:minmax(180px,55%)}.z-marketplace[data-zune-template="stories"] .z-product-card{border-radius:22px}
    .z-marketplace[data-zune-template="minimal"] .z-home-header{box-shadow:none;border:0;background:var(--background)}.z-marketplace[data-zune-template="minimal"] .z-icon-button{border:0;background:transparent}.z-marketplace[data-zune-template="minimal"] .z-home-carousel{border-radius:0;min-height:185px}.z-marketplace[data-zune-template="minimal"] .z-slide-copy{min-height:185px}.z-marketplace[data-zune-template="minimal"] .z-product-card{border:0;border-radius:0;box-shadow:none}.z-marketplace[data-zune-template="minimal"] .z-product-media{aspect-ratio:1/1}
    .z-marketplace[data-zune-template="deals"] .z-home-carousel{min-height:255px;border:3px solid #f0a33b}.z-marketplace[data-zune-template="deals"] .z-product-card{border-radius:12px}.z-marketplace[data-zune-template="deals"] .z-product-flag.discount{font-size:10px;padding:6px 9px}
    .z-marketplace[data-zune-template="showcase"] .z-home-content{max-width:1240px}.z-marketplace[data-zune-template="showcase"] .z-home-carousel,.z-marketplace[data-zune-template="showcase"] .z-slide-copy{min-height:310px}.z-marketplace[data-zune-template="showcase"] .z-home-carousel{border-radius:24px}.z-marketplace[data-zune-template="showcase"] .z-product-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.z-marketplace[data-zune-template="showcase"] .z-product-card{border-radius:20px}.z-marketplace[data-zune-template="showcase"] .z-product-media{aspect-ratio:1/1.08}
    @media(min-width:760px){.z-marketplace[data-zune-template="catalog"] .z-product-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.z-marketplace[data-zune-template="showcase"] .z-product-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:520px){.z-marketplace[data-zune-template="catalog"] .z-category-directory{grid-template-columns:repeat(2,minmax(0,1fr))}.z-marketplace[data-zune-template="catalog"] .z-product-grid,.z-marketplace[data-zune-template="showcase"] .z-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    /* Full-surface template system: themes apply to every Marketplace view, not only Home. */
    .z-marketplace{--z-template-radius:16px;--z-template-shadow:0 8px 26px rgba(18,35,28,.07)}
    .z-marketplace[data-zune-template="classic"]{--background:#f5f8f6;--surface:#fff;--text:#17251f;--text-muted:#718078;--border:#e2ebe5;--primary:#087a55;--z-template-radius:16px}
    .z-marketplace[data-zune-template="editorial"]{--background:#f7f4ef;--surface:#fffdf9;--text:#29251f;--text-muted:#82786d;--border:#e8e0d5;--primary:#8a5b38;--z-template-radius:5px;--z-template-shadow:0 2px 10px rgba(41,37,31,.05);font-family:Georgia,serif}
    .z-marketplace[data-zune-template="hero"]{--background:#101d35;--surface:#192a49;--text:#f4f7ff;--text-muted:#bdc9df;--border:#314565;--primary:#e9b85d;--z-template-radius:22px;--z-template-shadow:0 12px 32px rgba(0,0,0,.2)}
    .z-marketplace[data-zune-template="compact"]{--background:#f2f5f7;--surface:#fff;--text:#1e2933;--text-muted:#71808c;--border:#e0e6eb;--primary:#286b8f;--z-template-radius:9px;--z-template-shadow:0 2px 8px rgba(20,35,45,.05)}
    .z-marketplace[data-zune-template="boutique"]{--background:#f4eee8;--surface:#fffaf5;--text:#34251f;--text-muted:#8a766c;--border:#e8d9cf;--primary:#9a6048;--z-template-radius:4px;--z-template-shadow:0 5px 18px rgba(65,39,28,.08)}
    .z-marketplace[data-zune-template="catalog"]{--background:#f1f5fa;--surface:#fff;--text:#1e2c40;--text-muted:#718198;--border:#dce5f0;--primary:#2864a4;--z-template-radius:10px;--z-template-shadow:0 3px 12px rgba(30,60,95,.07)}
    .z-marketplace[data-zune-template="stories"]{--background:#f7f2fa;--surface:#fff;--text:#30233a;--text-muted:#85748e;--border:#eadff0;--primary:#8b55a5;--z-template-radius:22px;--z-template-shadow:0 8px 24px rgba(75,42,91,.08)}
    .z-marketplace[data-zune-template="minimal"]{--background:#fff;--surface:#fff;--text:#202020;--text-muted:#858585;--border:#ededed;--primary:#333;--z-template-radius:0;--z-template-shadow:none}
    .z-marketplace[data-zune-template="deals"]{--background:#fff8ed;--surface:#fff;--text:#382817;--text-muted:#927b61;--border:#f1dfc5;--primary:#d87519;--z-template-radius:12px;--z-template-shadow:0 5px 18px rgba(154,91,22,.09)}
    .z-marketplace[data-zune-template="showcase"]{--background:#111820;--surface:#1b2732;--text:#f3f6f8;--text-muted:#b4c0c9;--border:#35434e;--primary:#d6aa58;--z-template-radius:20px;--z-template-shadow:0 12px 30px rgba(0,0,0,.22)}
    .z-marketplace{background:var(--background);color:var(--text);min-height:100vh}
    .z-marketplace .z-home,.z-marketplace .z-home-content{background:var(--background);color:var(--text)}
    .z-marketplace .z-home-content{border-color:var(--border)}
    .z-marketplace .z-home-header,.z-marketplace .z-bottom-nav,.z-marketplace .z-account-section,.z-marketplace .z-empty-state,.z-marketplace .z-category-directory,.z-marketplace .z-search-results,.z-marketplace .z-cart-panel,.z-marketplace .z-order-summary{background:var(--surface);color:var(--text);border-color:var(--border)}
    .z-marketplace .z-section-heading h1,.z-marketplace .z-section-heading h2,.z-marketplace .z-page-title,.z-marketplace .z-account-section h2{color:var(--text)}
    .z-marketplace .z-product-card,.z-marketplace .z-category,.z-marketplace .z-account-shortcut,.z-marketplace .z-cart-item,.z-marketplace .z-seller-status{background:var(--surface);color:var(--text);border-color:var(--border);border-radius:var(--z-template-radius);box-shadow:var(--z-template-shadow)}
    .z-marketplace .z-product-card{overflow:hidden}
    .z-marketplace .z-product-card button,.z-marketplace .z-primary-button,.z-marketplace .z-search-submit{border-radius:var(--z-template-radius)}
    .z-marketplace .z-product-card h3,.z-marketplace .z-product-card strong,.z-marketplace .z-product-card .z-product-title{color:var(--text)}
    .z-marketplace .z-product-card p,.z-marketplace .z-product-card small,.z-marketplace .z-muted{color:var(--text-muted)}
    .z-marketplace .z-icon-button,.z-marketplace .z-bottom-nav button{color:var(--text);border-color:var(--border)}
    .z-marketplace .z-bottom-nav{border-top:1px solid var(--border)}
    .z-marketplace .z-home-carousel{border-radius:var(--z-template-radius);overflow:hidden}
    .z-marketplace .z-category{transition:transform .18s ease,box-shadow .18s ease}
    .z-marketplace .z-category:active,.z-marketplace .z-product-card:active{transform:scale(.99)}
    .z-marketplace[data-zune-template="hero"] .z-home-header,.z-marketplace[data-zune-template="showcase"] .z-home-header{background:var(--surface);color:var(--text);border-color:var(--border)}
    .z-marketplace[data-zune-template="hero"] .z-primary-button,.z-marketplace[data-zune-template="showcase"] .z-primary-button{background:var(--primary);color:#17202a}
    .z-marketplace[data-zune-template="minimal"] .z-product-card,.z-marketplace[data-zune-template="minimal"] .z-account-section{box-shadow:none}
    .z-marketplace[data-zune-template="compact"] .z-product-card{border-radius:8px}
    .z-marketplace[data-zune-template="stories"] .z-category{border-radius:22px}
    @media(prefers-reduced-motion:reduce){.z-marketplace .z-category{transition:none}}

  `;
  document.head.appendChild(style);
}

function renderMarketplacePage(page) {
  homeState.activeTab = page;
  if (page !== "home" && homeState.carouselTimer) {
    clearInterval(homeState.carouselTimer);
    homeState.carouselTimer = null;
  }

  if (homeState.observer) {
    homeState.observer.disconnect();
    homeState.observer = null;
  }

  const app = homeState.app;

  if (!app) return;

  if (page === "seller") {
    renderSellerDashboard({app,user:homeState.user,onBack:()=>renderMarketplacePage("me")});
    return;
  }

  let content;

  switch (page) {
    case "home":
      content = renderHomePage();
      break;

    case "explore":
      content = renderExplorePage();
      break;

    case "categories":
      content = renderCategoriesPage();
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

  applyMarketplaceTemplate();
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

    case "categories":
      bindCategoriesPage();
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
  // Cart na Wishlist ni za akaunti iliyoingia pekee; usisome legacy global keys.
  homeState.saved = readUserStorage("zune_saved_products", []);
  homeState.cart = readUserStorage("zune_cart", []);
  homeState.cartProducts = [];
  homeState.cartProductsKey = "";
  homeState.cartProductsLoading = false;
  homeState.cartProductsError = false;

  applyZuneTheme(localStorage.getItem("zune_theme") || "emerald");
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