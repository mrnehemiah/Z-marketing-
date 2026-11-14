
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
  cart: JSON.parse(localStorage.getItem("zune_cart") || "[]"),
  user: null,
  app: null,
  onLogout: null,
  observer: null,
  requestId: 0
};

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
    noCategories: "Makundi yataonekana hapa",
    loadError: "Imeshindikana kupakia bidhaa.",
    end: "Umefika mwisho wa bidhaa.",
    exploreTitle: "Gundua bidhaa",
    savedTitle: "Bidhaa ulizohifadhi",
    cartTitle: "Kikapu chako",
    homeTitle: "Gundua bidhaa bora kutoka kwa wauzaji mbalimbali.",
    addCart: "Weka kikapuni",
    added: "Imeongezwa kikapuni",
    remove: "Ondoa",
    total: "Jumla",
    continueShopping: "Endelea kununua",
    searchButton: "Tafuta",
    quantity: "Idadi",
    cartCount: "Bidhaa",
    emptyName: "Bidhaa"
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
    noCategories: "Categories will appear here",
    loadError: "Unable to load products.",
    end: "You have reached the end.",
    exploreTitle: "Explore products",
    savedTitle: "Your saved products",
    cartTitle: "Your shopping cart",
    homeTitle: "Discover great products from different sellers.",
    addCart: "Add to cart",
    added: "Added to cart",
    remove: "Remove",
    total: "Total",
    continueShopping: "Continue shopping",
    searchButton: "Search",
    quantity: "Quantity",
    cartCount: "Items",
    emptyName: "Product"
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

function getCartCount() {
  return homeState.cart.reduce(
    (total, item) => total + Math.max(0, Number(item.quantity) || 0),
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

/* MODERN ICONS */

function zIcon(name) {
  const icons = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    explore: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5M14 8l-2 5-5 2 2-5z"/>',
    cart: '<path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 1.9-1.5L22 8H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/>',
    saved: '<path d="M20.8 8.6c0 5.1-8.8 11-8.8 11s-8.8-5.9-8.8-11a4.8 4.8 0 0 1 8.8-2.5 4.8 4.8 0 0 1 8.8 2.5z"/>',
    account: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    filter: '<path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="8" cy="7" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="11" cy="17" r="1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7"/>',
    arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>'
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
    >${icons[name] || icons.home}</svg>
  `;
}

/* LUXURY EMERALD MARKETPLACE STYLES */

function addHomeStyles() {
  if (document.getElementById("zuneHomeStyles")) return;

  const style = document.createElement("style");
  style.id = "zuneHomeStyles";

  style.textContent = `
    .z-home {
      min-height: 100vh;
      background: var(--background);
      color: var(--text);
      padding-bottom: 100px;
      font-family: inherit;
    }

    .z-home-header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 15px 16px 14px;
      position: sticky;
      top: 0;
      z-index: 20;
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

    .z-home-brand .zune-logo {
      font-size: 25px;
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
      border: 1px solid var(--border);
      background: var(--background);
      color: var(--text);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform .2s ease, background .2s ease;
    }

    .z-icon-button:active {
      transform: scale(.94);
    }

    .z-search-box {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 15px;
      padding: 0 13px;
      min-height: 49px;
      transition: border-color .2s ease, box-shadow .2s ease;
    }

    .z-search-box:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
    }

    .z-search-box svg {
      flex-shrink: 0;
      color: var(--text-muted);
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
      padding: 19px 15px 25px;
    }

    .z-home-welcome {
      position: relative;
      overflow: hidden;
      background: var(--primary);
      color: white;
      border-radius: 21px;
      padding: 23px 19px;
      margin-bottom: 26px;
      box-shadow: 0 9px 25px color-mix(in srgb, var(--primary) 17%, transparent);
    }

    .z-home-welcome::after {
      content: "";
      position: absolute;
      width: 170px;
      height: 170px;
      right: -65px;
      top: -75px;
      border: 1px solid rgb(255 255 255 / 17%);
      border-radius: 50%;
      box-shadow: 0 0 0 22px rgb(255 255 255 / 5%),
                  0 0 0 45px rgb(255 255 255 / 4%);
      pointer-events: none;
    }

    .z-welcome-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.1px;
      text-transform: uppercase;
      opacity: .9;
      margin-bottom: 11px;
    }

    .z-home-welcome h2 {
      position: relative;
      z-index: 1;
      margin: 0 0 8px;
      font-size: 22px;
      line-height: 1.25;
      font-weight: 800;
    }

    .z-home-welcome p {
      position: relative;
      z-index: 1;
      margin: 0;
      max-width: 290px;
      opacity: .9;
      line-height: 1.55;
      font-size: 13px;
    }

    .z-section-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 23px 0 13px;
      gap: 10px;
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
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: background .2s ease, color .2s ease, transform .2s ease;
    }

    .z-category:active {
      transform: scale(.96);
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
      border-radius: 17px;
      position: relative;
      box-shadow: 0 3px 12px rgb(0 0 0 / 3%);
      transition: transform .2s ease, box-shadow .2s ease;
    }

    .z-product-card:active {
      transform: scale(.985);
    }

    .z-product-image,
    .z-product-placeholder {
      width: 100%;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--background);
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
      color: var(--primary);
      margin: 0 0 6px;
    }

    .z-product-category {
      font-size: 11px;
      color: var(--text-muted);
      margin: 0 0 10px;
    }

    .z-save-product {
      position: absolute;
      top: 9px;
      right: 9px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      border-radius: 50%;
      width: 35px;
      height: 35px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      cursor: pointer;
      box-shadow: var(--shadow);
    }

    .z-add-cart {
      width: 100%;
      min-height: 37px;
      border: none;
      border-radius: 10px;
      background: var(--primary);
      color: white;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: opacity .2s ease, transform .2s ease;
    }

    .z-add-cart:active {
      transform: scale(.97);
    }

    .z-empty-state {
      padding: 35px 15px;
      text-align: center;
      color: var(--text-muted);
      background: var(--surface);
      border: 1px dashed var(--border);
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
      gap: 3px;
      background: var(--surface);
      border-top: 1px solid var(--border);
      padding: 9px 7px calc(9px + env(safe-area-inset-bottom));
      box-shadow: 0 -5px 20px rgb(0 0 0 / 4%);
    }

    .z-nav-item {
      position: relative;
      border: none;
      background: transparent;
      color: var(--text-muted);
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
      -webkit-tap-highlight-color: transparent;
    }

    .z-nav-icon {
      position: relative;
      width: 42px;
      height: 34px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .2s ease, color .2s ease, transform .2s ease;
    }

    .z-nav-item.active {
      color: var(--primary);
      font-weight: 800;
    }

    .z-nav-item.active .z-nav-icon {
      background: var(--primary);
      color: white;
      transform: translateY(-2px);
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
      border: 2px solid var(--surface);
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

    .z-account-card {
      padding: 22px;
      border-radius: 18px;
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

    .z-cart-list {
      display: grid;
      gap: 12px;
    }

    .z-cart-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 15px;
    }

    .z-cart-item img,
    .z-cart-item-placeholder {
      width: 76px;
      height: 76px;
      flex-shrink: 0;
      object-fit: cover;
      border-radius: 11px;
      background: var(--background);
    }

    .z-cart-item-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
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

    .z-cart-item-info p {
      color: var(--primary);
      font-weight: 800;
      font-size: 13px;
      margin: 0;
    }

    .z-quantity-controls {
      display: flex;
      align-items: center;
      gap: 9px;
      margin-top: 9px;
    }

    .z-quantity-controls button {
      width: 27px;
      height: 27px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--background);
      color: var(--text);
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

    .z-cart-summary {
      margin-top: 18px;
      padding: 17px;
      border-radius: 16px;
      background: var(--surface);
      border: 1px solid var(--border);
    }

    .z-cart-total {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-weight: 900;
      font-size: 17px;
    }

    .z-continue-shopping {
      width: 100%;
      border: 1px solid var(--primary);
      background: transparent;
      color: var(--primary);
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
        border: 1px solid var(--border);
        border-radius: 19px;
        padding-bottom: 9px;
      }

      .z-home {
        padding-bottom: 115px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .z-home *,
      .z-home *::before,
      .z-home *::after {
        scroll-behavior: auto !important;
        transition: none !important;
        animation: none !important;
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
  if (reset) {
    homeState.requestId++;
    homeState.page = 0;
    homeState.products = [];
    homeState.hasMore = true;
    homeState.loading = false;
  }

  if (homeState.loading || !homeState.hasMore) return;

  const currentRequest = homeState.requestId;

  homeState.loading = true;
  updateProductArea();
  updateLoadStatus();

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

    if (currentRequest !== homeState.requestId) return;
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
    if (currentRequest !== homeState.requestId) return;

    console.error("ZUNE product loading error:", error);
    showLoadError();

  } finally {
    if (currentRequest === homeState.requestId) {
      homeState.loading = false;
      updateLoadStatus();
    }
  }
}
