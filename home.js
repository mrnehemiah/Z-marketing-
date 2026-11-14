
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

/* PRODUCT CARD */

function productCard(product) {
  const saved = homeState.saved.includes(product.id);

  const image =
    product.image_url ||
    (Array.isArray(product.image_urls) ? product.image_urls[0] : "");

  const category = product.category || "";

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
        ${saved ? "♥" : "♡"}
      </button>

      <div class="z-product-info">
        <h3 class="z-product-name">
          ${safe(product.title)}
        </h3>

        <p class="z-product-price">
          ${money(product.price)}
        </p>

        <p class="z-product-category">
          ${safe(category)}
        </p>

        <button
          class="z-add-cart"
          data-add-cart="${safe(product.id)}"
        >
          ${zIcon("cart")}
          ${safe(tx("addCart"))}
        </button>
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
            ? safe(tx("emptySearch"))
            : safe(tx("empty"))
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

  grid.querySelectorAll("[data-add-cart]").forEach(button => {
    button.onclick = () => {
      addToCart(button.dataset.addCart);
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
    <button id="zRetryProducts" class="z-continue-shopping">
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

/* CART FUNCTIONS */

function addToCart(productId) {
  const product = homeState.products.find(
    item => String(item.id) === String(productId)
  );

  if (!product) return;

  const existing = homeState.cart.find(
    item => String(item.id) === String(productId)
  );

  if (existing) {
    existing.quantity = (Number(existing.quantity) || 0) + 1;
  } else {
    homeState.cart.push({
      id: product.id,
      quantity: 1
    });
  }

  saveCart();

  const button = document.querySelector(
    `[data-add-cart="${CSS.escape(String(productId))}"]`
  );

  if (button) {
    const original = button.innerHTML;
    button.textContent = tx("added");

    setTimeout(() => {
      if (button.isConnected) {
        button.innerHTML = original;
      }
    }, 1000);
  }
}

function changeCartQuantity(productId, change) {
  const item = homeState.cart.find(
    entry => String(entry.id) === String(productId)
  );

  if (!item) return;

  item.quantity = (Number(item.quantity) || 0) + change;

  if (item.quantity <= 0) {
    homeState.cart = homeState.cart.filter(
      entry => String(entry.id) !== String(productId)
    );
  }

  saveCart();
  renderCartPage();
}

function removeCartItem(productId) {
  homeState.cart = homeState.cart.filter(
    item => String(item.id) !== String(productId)
  );

  saveCart();
  renderCartPage();
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
            <button class="z-icon-button" id="zSavedShortcut"
              aria-label="${safe(tx("saved"))}">
              ${zIcon("saved")}
            </button>

            <button class="z-icon-button" id="zAccountShortcut"
              aria-label="${safe(tx("me"))}">
              ${zIcon("account")}
            </button>
          </div>
        </div>

        <div class="z-search-box">
          ${zIcon("search")}
          <input
            id="zProductSearch"
            type="search"
            placeholder="${safe(tx("search"))}"
          >
        </div>
      </header>

      <main class="z-home-content">
        <section class="z-home-welcome">
          <div class="z-welcome-tag">✦ ZUNE MARKETPLACE</div>

          <h2>
            ${safe(name ? `Habari, ${name}!` : tx("welcome"))}
          </h2>

          <p>${safe(tx("homeTitle"))}</p>
        </section>

        <div class="z-section-heading">
          <h2>${safe(tx("categories"))}</h2>
        </div>

        <div class="z-category-list" id="zCategoryList">
          <button class="z-category active">
            ${safe(tx("all"))}
          </button>
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
  bindNavigation();
}

/* BOTTOM NAVIGATION */

function renderBottomNavigation() {
  const items = [
    ["home", "home", tx("home")],
    ["explore", "explore", tx("explore")],
    ["cart", "cart", tx("cart")],
    ["saved", "saved", tx("saved")],
    ["me", "account", tx("me")]
  ];

  return `
    <nav class="z-bottom-nav" aria-label="Marketplace navigation">
      ${items.map(([id, icon, label]) => `
        <button
          class="z-nav-item ${
            homeState.activeTab === id ? "active" : ""
          }"
          data-nav="${id}"
          aria-current="${homeState.activeTab === id ? "page" : "false"}"
        >
          <span class="z-nav-icon">
            ${zIcon(icon)}

            ${
              id === "cart"
                ? `<span class="z-cart-badge" data-cart-count ${
                    getCartCount() === 0 ? "hidden" : ""
                  }>${getCartCount() > 99 ? "99+" : getCartCount()}</span>`
                : ""
            }
          </span>

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
      if (page === "cart") renderCartPage();
      if (page === "saved") renderSavedPage();
      if (page === "me") renderAccountPage();
    };
  });
}

/* INFINITE SCROLL */

function observeInfiniteScroll() {
  if (homeState.observer) {
    homeState.observer.disconnect();
    homeState.observer = null;
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
        <div class="z-home-top">
          <div class="z-home-brand">${homeLogo()}</div>
        </div>

        <div class="z-search-box">
          ${zIcon("search")}
          <input
            id="zExploreSearch"
            type="search"
            placeholder="${safe(tx("search"))}"
            value="${safe(homeState.search)}"
          >
        </div>
      </header>

      <main class="z-home-content">
        <h2 class="z-page-title">${safe(tx("exploreTitle"))}</h2>

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

/* CART PAGE */

function renderCartPage() {
  homeState.activeTab = "cart";

  const cartProducts = homeState.cart.map(item => {
    const product = homeState.products.find(
      entry => String(entry.id) === String(item.id)
    );

    return product ? {
      ...product,
      quantity: Number(item.quantity) || 1
    } : null;
  }).filter(Boolean);

  const total = cartProducts.reduce(
    (sum, product) => sum + Number(product.price || 0) * product.quantity,
    0
  );

  homeState.app.innerHTML = `
    <div class="z-home">
      <header class="z-home-header">
        <div class="z-home-brand">${homeLogo()}</div>
      </header>

      <main class="z-home-content">
        <h2 class="z-page-title">${safe(tx("cartTitle"))}</h2>

        ${
          cartProducts.length
            ? `
              <div class="z-cart-list">
                ${cartProducts.map(product => {
                  const image = product.image_url ||
                    (Array.isArray(product.image_urls)
                      ? product.image_urls[0]
                      : "");

                  return `
                    <article class="z-cart-item">
                      ${
                        image
                          ? `<img src="${safe(image)}" alt="${safe(product.title)}" loading="lazy">`
                          : `<div class="z-cart-item-placeholder">🛍️</div>`
                      }

                      <div class="z-cart-item-info">
                        <h3>${safe(product.title)}</h3>

                        <p>${money(product.price)}</p>

                        <div class="z-quantity-controls">
                          <button data-quantity-minus="${safe(product.id)}"
                            aria-label="Decrease quantity">
                            ${zIcon("minus")}
                          </button>

                          <strong>${product.quantity}</strong>

                          <button data-quantity-plus="${safe(product.id)}"
                            aria-label="Increase quantity">
                            ${zIcon("plus")}
                          </button>
                        </div>
                      </div>

                      <button
                        class="z-cart-remove"
                        data-remove-cart="${safe(product.id)}"
                        aria-label="${safe(tx("remove"))}"
                      >
                        ${zIcon("trash")}
                      </button>
                    </article>
                  `;
                }).join("")}
              </div>

              <div class="z-cart-summary">
                <div class="z-cart-total">
                  <span>${safe(tx("total"))}</span>
                  <span>${money(total)}</span>
                </div>

                <button class="z-continue-shopping" id="zContinueShopping">
                  ${safe(tx("continueShopping"))}
                  →
                </button>
              </div>
            `
            : `
              <div class="z-empty-state">
                <span class="z-empty-icon">${zIcon("cart")}</span>
                ${safe(tx("cartEmpty"))}
                <button class="z-continue-shopping" id="zContinueShopping">
                  ${safe(tx("continueShopping"))}
                </button>
              </div>
            `
        }
      </main>

      ${renderBottomNavigation()}
    </div>
  `;

  document.querySelectorAll("[data-quantity-minus]").forEach(button => {
    button.onclick = () => {
      changeCartQuantity(button.dataset.quantityMinus, -1);
    };
  });

  document.querySelectorAll("[data-quantity-plus]").forEach(button => {
    button.onclick = () => {
      changeCartQuantity(button.dataset.quantityPlus, 1);
    };
  });

  document.querySelectorAll("[data-remove-cart]").forEach(button => {
    button.onclick = () => {
      removeCartItem(button.dataset.removeCart);
    };
  });

  document.getElementById("zContinueShopping").onclick = renderExplorePage;

  bindNavigation();
}
// ==========================================
// ZUNE MARKETPLACE 2.0
// HOME.JS — SEHEMU YA 3/3
// ==========================================

function renderCartPage() {
  const cartItems = homeState.cart || [];

  const items = cartItems
    .map((item) => {
      const product = homeState.products.find(
        (p) => String(p.id) === String(item.productId)
      );

      return product ? { ...item, product } : null;
    })
    .filter(Boolean);

  const total = items.reduce(
    (sum, item) => sum + Number(item.product.price || 0) * item.quantity,
    0
  );

  return `
    <section class="z-page">
      <div class="z-page-heading">
        <div>
          <span class="z-eyebrow">${tx("yourCart")}</span>
          <h1>${tx("cart")}</h1>
        </div>
        <span class="z-cart-count">${getCartCount()}</span>
      </div>

      ${
        items.length
          ? `
            <div class="z-cart-layout">
              <div class="z-cart-items">
                ${items
                  .map(
                    ({ product, quantity }) => `
                      <article class="z-cart-item">
                        <img
                          src="${safe(product.image_url || "")}"
                          alt="${safe(product.title)}"
                          onerror="this.style.display='none'"
                        >

                        <div class="z-cart-item-info">
                          <h3>${safe(product.title)}</h3>
                          <strong>${money(product.price)}</strong>

                          <div class="z-quantity-control">
                            <button
                              type="button"
                              data-cart-minus="${safe(product.id)}"
                              aria-label="Decrease quantity"
                            >−</button>

                            <span>${quantity}</span>

                            <button
                              type="button"
                              data-cart-plus="${safe(product.id)}"
                              aria-label="Increase quantity"
                            >+</button>
                          </div>
                        </div>

                        <button
                          type="button"
                          class="z-remove-cart"
                          data-cart-remove="${safe(product.id)}"
                          aria-label="Remove item"
                        >×</button>
                      </article>
                    `
                  )
                  .join("")}
              </div>

              <aside class="z-cart-summary">
                <h2>${tx("orderSummary")}</h2>

                <div class="z-summary-row">
                  <span>${tx("subtotal")}</span>
                  <strong>${money(total)}</strong>
                </div>

                <div class="z-summary-row z-summary-total">
                  <span>${tx("total")}</span>
                  <strong>${money(total)}</strong>
                </div>

                <button
                  type="button"
                  class="z-primary-button z-checkout-button"
                  id="z-checkout-button"
                >
                  ${tx("checkout")}
                </button>

                <p class="z-checkout-note">
                  ${tx("checkoutNote")}
                </p>
              </aside>
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
    </section>
  `;
}

function bindCartPage() {
  document.querySelectorAll("[data-cart-minus]").forEach((button) => {
    button.addEventListener("click", () => {
      changeCartQuantity(button.dataset.cartMinus, -1);
      renderMarketplacePage("cart");
    });
  });

  document.querySelectorAll("[data-cart-plus]").forEach((button) => {
    button.addEventListener("click", () => {
      changeCartQuantity(button.dataset.cartPlus, 1);
      renderMarketplacePage("cart");
    });
  });

  document.querySelectorAll("[data-cart-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      removeCartItem(button.dataset.cartRemove);
      renderMarketplacePage("cart");
    });
  });

  document.querySelector("[data-go-home]")?.addEventListener("click", () => {
    renderMarketplacePage("home");
  });

  document
    .getElementById("z-checkout-button")
    ?.addEventListener("click", () => {
      alert(tx("checkoutComingSoon"));
    });
}

function renderSavedPage() {
  const savedIds = homeState.saved || [];

  const products = homeState.products.filter((product) =>
    savedIds.includes(String(product.id))
  );

  return `
    <section class="z-page">
      <div class="z-page-heading">
        <div>
          <span class="z-eyebrow">${tx("yourCollection")}</span>
          <h1>${tx("saved")}</h1>
        </div>
        <span class="z-cart-count">${products.length}</span>
      </div>

      ${
        products.length
          ? `
            <div class="z-product-grid">
              ${products.map(productCard).join("")}
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
    </section>
  `;
}

function bindSavedPage() {
  updateProductArea();

  document.querySelector("[data-go-home]")?.addEventListener("click", () => {
    renderMarketplacePage("home");
  });
}

function renderAccountPage() {
  const user = homeState.user;

  const email = user?.email || "";
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    email.split("@")[0] ||
    "ZUNE Customer";

  return `
    <section class="z-page">
      <div class="z-page-heading">
        <div>
          <span class="z-eyebrow">${tx("yourProfile")}</span>
          <h1>${tx("account")}</h1>
        </div>
      </div>

      <div class="z-account-card">
        <div class="z-account-avatar">
          ${safe(displayName.charAt(0).toUpperCase())}
        </div>

        <div class="z-account-info">
          <h2>${safe(displayName)}</h2>
          <p>${safe(email)}</p>
        </div>
      </div>

      <div class="z-account-menu">
        <button type="button" class="z-account-menu-item" data-account-saved>
          <span>♡</span>
          <span>${tx("saved")}</span>
          <span>›</span>
        </button>

        <button type="button" class="z-account-menu-item" data-account-cart>
          <span>🛒</span>
          <span>${tx("cart")}</span>
          <span>›</span>
        </button>
      </div>

      <button
        type="button"
        class="z-logout-button"
        id="z-logout-button"
      >
        ${tx("logout")}
      </button>
    </section>
  `;
}

function bindAccountPage() {
  document
    .querySelector("[data-account-saved]")
    ?.addEventListener("click", () => {
      renderMarketplacePage("saved");
    });

  document
    .querySelector("[data-account-cart]")
    ?.addEventListener("click", () => {
      renderMarketplacePage("cart");
    });

  document
    .getElementById("z-logout-button")
    ?.addEventListener("click", async () => {
      if (typeof homeState.onLogout === "function") {
        await homeState.onLogout();
      } else {
        const { error } = await supabase.auth.signOut();

        if (error) {
          alert(error.message);
        }
      }
    });
}

function renderMarketplacePage(page) {
  homeState.activeTab = page;

  const app = homeState.app;

  if (!app) return;

  let content = "";

  if (page === "home") {
    content = renderHomePage();
  } else if (page === "explore") {
    content = renderExplorePage();
  } else if (page === "cart") {
    content = renderCartPage();
  } else if (page === "saved") {
    content = renderSavedPage();
  } else if (page === "me") {
    content = renderAccountPage();
  } else {
    content = renderHomePage();
  }

  app.innerHTML = `
    <div class="z-marketplace">
      ${content}
      ${renderBottomNavigation()}
    </div>
  `;

  bindNavigation();

  if (page === "home") {
    observeInfiniteScroll();
  }

  if (page === "explore" || page === "saved") {
    updateProductArea();
  }

  if (page === "cart") {
    bindCartPage();
  }

  if (page === "saved") {
    bindSavedPage();
  }

  if (page === "me") {
    bindAccountPage();
  }

  updateCartBadges();
}

export async function renderMarketplaceHome({
  app,
  user,
  onLogout
}) {
  if (!app) {
    console.error("ZUNE: Marketplace app container haijapatikana.");
    return;
  }

  homeState.app = app;
  homeState.user = user || null;
  homeState.onLogout = onLogout || null;

  addHomeStyles();

  try {
    await Promise.all([
      loadCategories(),
      loadProducts(true)
    ]);
  } catch (error) {
    console.error("ZUNE Marketplace initialization error:", error);
  }

  renderMarketplacePage("home");
}