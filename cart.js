/* =========================================
   ZUNE MARKETPLACE 2.0
   CART MODULE
   Shared by the SPA and standalone cart.html
========================================= */

import { supabase } from "./supabase.js";

const CART_KEY = "zune_cart";

const TEXT = {
  sw: {
    title: "Kikapu chako",
    subtitle: "Bidhaa ulizochagua kununua",
    items: "Bidhaa",
    empty: "Kikapu kiko tupu",
    emptyText: "Bado hujaongeza bidhaa kwenye kikapu chako. Endelea kuchunguza bidhaa na uweke unazozipenda hapa.",
    continue: "Endelea kununua",
    remove: "Ondoa",
    quantity: "Idadi",
    summary: "Muhtasari wa kikapu",
    subtotal: "Jumla ndogo",
    total: "Jumla ya bidhaa",
    checkout: "Endelea kulipia",
    checkoutNote: "Hatua ya malipo itaunganishwa baada ya mfumo wa checkout kukamilika.",
    loading: "Inapakia bidhaa za kikapu...",
    loadError: "Imeshindikana kupakia baadhi ya bidhaa. Tafadhali jaribu tena.",
    unavailable: "Bidhaa hii haipatikani kwa sasa.",
    retry: "Jaribu tena",
    unit: "Bei ya bidhaa",
    lineTotal: "Jumla"
  },
  en: {
    title: "Your shopping cart",
    subtitle: "Products you have selected",
    items: "Items",
    empty: "Your cart is empty",
    emptyText: "You have not added anything yet. Continue exploring and add products you would like to buy.",
    continue: "Continue shopping",
    remove: "Remove",
    quantity: "Quantity",
    summary: "Cart summary",
    subtotal: "Subtotal",
    total: "Items total",
    checkout: "Continue to checkout",
    checkoutNote: "Checkout and payment will be connected when the checkout flow is ready.",
    loading: "Loading cart products...",
    loadError: "Some cart products could not be loaded. Please try again.",
    unavailable: "This product is currently unavailable.",
    retry: "Try again",
    unit: "Unit price",
    lineTotal: "Line total"
  }
};

function text(language, key) {
  return TEXT[language === "en" ? "en" : "sw"][key] || key;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function money(value, language) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat(language === "en" ? "en-TZ" : "sw-TZ").format(amount) + " TSh";
}

export function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(item => item && item.productId != null) : [];
  } catch (error) {
    console.warn("ZUNE cart storage read failed:", error);
    return [];
  }
}

export function writeCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(Array.isArray(cart) ? cart : []));
  const count = (cart || []).reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
  document.querySelectorAll("[data-cart-count]").forEach(badge => {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
  });
}

export async function loadCartProducts(cart = readCart()) {
  const ids = [...new Set((cart || []).map(item => String(item.productId)).filter(Boolean))];
  if (!ids.length) return [];
  const { data, error } = await supabase.from("products").select("*").in("id", ids);
  if (error) throw error;
  return data || [];
}

export function renderCartPage({ cart = [], products = [], language = "sw", loading = false, error = false } = {}) {
  const t = key => text(language, key);
  const byId = new Map((products || []).map(product => [String(product.id), product]));
  const rows = (cart || []).map(item => ({ ...item, product: byId.get(String(item.productId)) || null }));
  const availableRows = rows.filter(row => row.product);
  const subtotal = availableRows.reduce((sum, row) => sum + Number(row.product.price || 0) * Math.max(1, Number(row.quantity) || 1), 0);
  const count = (cart || []).reduce((sum, row) => sum + Math.max(0, Number(row.quantity) || 0), 0);

  if (!cart.length) {
    return `
      <section class="z-home z-cart-page">
        <main class="z-home-content z-cart-content">
          <header class="z-cart-heading">
            <div><span class="z-cart-eyebrow">ⓏⓊⓃⒺ MARKETPLACE</span><h1 class="z-page-title">${t("title")}</h1><p>${t("subtitle")}</p></div>
            <span class="z-cart-heading-icon" aria-hidden="true">🛒</span>
          </header>
          <section class="z-cart-empty">
            <div class="z-cart-empty-art" aria-hidden="true"><span>🛍️</span></div>
            <h2>${t("empty")}</h2><p>${t("emptyText")}</p>
            <button type="button" class="z-primary-button" data-cart-continue>${t("continue")}</button>
          </section>
        </main>
      </section>`;
  }

  return `
    <section class="z-home z-cart-page">
      <main class="z-home-content z-cart-content">
        <header class="z-cart-heading">
          <div><span class="z-cart-eyebrow">ⓏⓊⓃⒺ MARKETPLACE</span><h1 class="z-page-title">${t("title")}</h1><p>${count} ${t("items")}</p></div>
          <span class="z-cart-heading-icon" aria-hidden="true">🛒</span>
        </header>
        ${loading ? `<p class="z-cart-status" role="status">${t("loading")}</p>` : ""}
        ${error ? `<p class="z-cart-status error" role="alert">${t("loadError")}</p>` : ""}
        <div class="z-cart-layout">
          <section class="z-cart-items" aria-label="${t("title")}">
            ${rows.map(row => {
              const product = row.product;
              const quantity = Math.max(1, Number(row.quantity) || 1);
              if (!product) return `
                <article class="z-cart-item z-cart-item-unavailable">
                  <div class="z-cart-item-placeholder" aria-hidden="true">📦</div>
                  <div class="z-cart-item-info"><h3>${t("unavailable")}</h3><p>${escapeHTML(row.productId)}</p></div>
                  <button type="button" class="z-cart-remove" data-cart-remove="${escapeHTML(row.productId)}">${t("remove")}</button>
                </article>`;
              const image = product.image_url || "";
              return `
                <article class="z-cart-item">
                  ${image ? `<img class="z-cart-product-image" src="${escapeHTML(image)}" alt="${escapeHTML(product.title || "Product")}" loading="lazy">` : `<div class="z-cart-item-placeholder" aria-hidden="true">📦</div>`}
                  <div class="z-cart-item-info">
                    <h3>${escapeHTML(product.title || (language === "en" ? "Product" : "Bidhaa"))}</h3>
                    <strong class="z-cart-unit-price">${money(product.price, language)}</strong>
                    <div class="z-quantity-controls" aria-label="${t("quantity")}">
                      <button type="button" data-cart-minus="${escapeHTML(row.productId)}" aria-label="Decrease quantity">−</button>
                      <span>${quantity}</span>
                      <button type="button" data-cart-plus="${escapeHTML(row.productId)}" aria-label="Increase quantity">+</button>
                    </div>
                  </div>
                  <div class="z-cart-item-end">
                    <strong class="z-cart-line-total">${money(Number(product.price || 0) * quantity, language)}</strong>
                    <button type="button" class="z-cart-remove" data-cart-remove="${escapeHTML(row.productId)}">${t("remove")}</button>
                  </div>
                </article>`;
            }).join("")}
          </section>
          <aside class="z-cart-summary">
            <h2>${t("summary")}</h2>
            <div class="z-cart-summary-row"><span>${t("subtotal")}</span><strong>${money(subtotal, language)}</strong></div>
            <div class="z-cart-summary-total"><span>${t("total")}</span><strong>${money(subtotal, language)}</strong></div>
            <button type="button" class="z-primary-button z-cart-checkout" data-cart-checkout>${t("checkout")}</button>
            <p class="z-cart-checkout-note">${t("checkoutNote")}</p>
            <button type="button" class="z-continue-shopping" data-cart-continue>${t("continue")}</button>
          </aside>
        </div>
      </main>
    </section>`;
}

export function bindCartEvents(root = document, handlers = {}) {
  root.querySelectorAll("[data-cart-minus]").forEach(button => button.addEventListener("click", () => handlers.onQuantityChange?.(button.dataset.cartMinus, -1)));
  root.querySelectorAll("[data-cart-plus]").forEach(button => button.addEventListener("click", () => handlers.onQuantityChange?.(button.dataset.cartPlus, 1)));
  root.querySelectorAll("[data-cart-remove]").forEach(button => button.addEventListener("click", () => handlers.onRemove?.(button.dataset.cartRemove)));
  root.querySelectorAll("[data-cart-continue]").forEach(button => button.addEventListener("click", () => handlers.onContinueShopping?.()));
  root.querySelector("[data-cart-checkout]")?.addEventListener("click", () => handlers.onCheckout?.());
}

export async function mountStandaloneCart(root) {
  if (!root) return;
  const language = localStorage.getItem("zune_language") === "en" ? "en" : "sw";
  const theme = localStorage.getItem("zune_theme") || "emerald";
  document.documentElement.dataset.theme = theme;
  let cart = readCart();

  const render = async () => {
    cart = readCart();
    root.innerHTML = renderCartPage({ cart, products: [], language, loading: cart.length > 0 });
    if (!cart.length) {
      bind();
      return;
    }
    try {
      const products = await loadCartProducts(cart);
      if (JSON.stringify(readCart()) !== JSON.stringify(cart)) return render();
      root.innerHTML = renderCartPage({ cart, products, language });
    } catch (error) {
      console.error("ZUNE standalone cart error:", error);
      root.innerHTML = renderCartPage({ cart, products: [], language, error: true });
    }
    bind();
  };

  const bind = () => bindCartEvents(root, {
    onQuantityChange: (id, delta) => {
      cart = readCart();
      const item = cart.find(row => String(row.productId) === String(id));
      if (item) item.quantity = Math.max(0, Number(item.quantity || 1) + delta);
      cart = cart.filter(row => Number(row.quantity) > 0);
      writeCart(cart);
      render();
    },
    onRemove: id => {
      writeCart(readCart().filter(row => String(row.productId) !== String(id)));
      render();
    },
    onContinueShopping: () => window.location.assign("./index.html"),
    onCheckout: () => alert(language === "en" ? "Checkout will be available soon." : "Mfumo wa malipo utaunganishwa baadaye.")
  });

  await render();
}
