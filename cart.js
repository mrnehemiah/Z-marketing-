import { supabase } from "./supabase.js";

const CART_KEY   = "zune_cart";

function cartStorageKey(userId) {
  return userId ? `${CART_KEY}:${userId}` : null;
}
const LANG_KEY   = "zune_language";
const THEME_KEY  = "zune_theme";
const MAX_QTY    = 99;
const QUERY_CHUNK = 100; // kikomo cha .in() cha Supabase

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
    lineTotal: "Jumla",
    increaseQty: "Ongeza idadi",
    decreaseQty: "Punguza idadi"
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
    lineTotal: "Line total",
    increaseQty: "Increase quantity",
    decreaseQty: "Decrease quantity"
  }
};

function text(language, key) {
  return TEXT[language === "en" ? "en" : "sw"][key] || key;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[c]);
}

/* ---------- Pesa: formatter cache + rounding ---------- */
const moneyFormatters = new Map();

function money(value, language) {
  const locale = language === "en" ? "en-TZ" : "sw-TZ";
  let fmt = moneyFormatters.get(locale);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    moneyFormatters.set(locale, fmt);
  }
  return fmt.format(Math.round(Number(value) || 0)) + " TSh";
}

/* ---------- Storage ---------- */
function normalizeItem(item) {
  if (!item || item.productId == null) return null;
  const raw = Number(item.quantity);
  const quantity = Math.min(MAX_QTY, Math.max(0, Math.floor(Number.isFinite(raw) ? raw : 1)));
  return { productId: item.productId, quantity };
}

export function readCart(userId) {
  const key = cartStorageKey(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeItem).filter(item => item && item.quantity > 0);
  } catch (error) {
    console.warn("ZUNE cart storage read failed:", error);
    return [];
  }
}

export function writeCart(cart, userId) {
  const normalized = (Array.isArray(cart) ? cart : [])
    .map(normalizeItem)
    .filter(item => item && item.quantity > 0);
  const key = cartStorageKey(userId);
  try {
    if (key) localStorage.setItem(key, JSON.stringify(normalized));
  } catch (error) {
    console.warn("ZUNE cart storage write failed:", error);
  }
  syncCartCountBadges(normalized);
  return normalized;
}

export function syncCartCountBadges(cart = []) {
  const count = (cart || []).reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
  document.querySelectorAll("[data-cart-count]").forEach(badge => {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
  });
}

/* ---------- Data ---------- */
export async function loadCartProducts(cart = []) {
  const ids = [...new Set((cart || []).map(i => String(i.productId)).filter(Boolean))];
  if (!ids.length) return [];

  const chunks = [];
  for (let i = 0; i < ids.length; i += QUERY_CHUNK) chunks.push(ids.slice(i, i + QUERY_CHUNK));

  const settled = await Promise.allSettled(
    chunks.map(chunk => supabase.from("products").select("*").in("id", chunk))
  );

  const products = [];
  const errors = [];
  for (const result of settled) {
    if (result.status === "rejected") { errors.push(result.reason); continue; }
    const { data, error } = result.value;
    if (error) { errors.push(error); continue; }
    if (data) products.push(...data);
  }

  if (!products.length && errors.length) throw errors[0];
  if (errors.length) console.warn("ZUNE cart: baadhi ya bidhaa hazikupakiwa", errors);
  return products;
}

function computeTotals(cart, products) {
  const byId = new Map((products || []).map(p => [String(p.id), p]));
  const rows = (cart || []).map(item => {
    const product = byId.get(String(item.productId)) || null;
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    return { productId: item.productId, quantity, product,
      lineTotal: product ? Number(product.price || 0) * quantity : 0 };
  });
  const subtotal = rows.reduce((sum, r) => sum + r.lineTotal, 0);
  const count = rows.reduce((sum, r) => sum + r.quantity, 0);
  return { rows, subtotal, count };
}

/* ---------- Rendering ---------- */
export function renderCartPage({ cart = [], products = [], language = "sw", loading = false, error = false } = {}) {
  const t = key => text(language, key);
  const { rows, subtotal, count } = computeTotals(cart, products);

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
        ${error ? `<p class="z-cart-status error" role="alert">${t("loadError")}</p>
                   <button type="button" class="z-secondary-button" data-cart-retry>${t("retry")}</button>` : ""}
        <div class="z-cart-layout">
          <section class="z-cart-items" aria-label="${t("title")}">
            ${rows.map(row => {
              const product = row.product;
              const quantity = row.quantity;
              if (!product) return `
                <article class="z-cart-item z-cart-item-unavailable" data-cart-row="${escapeHTML(row.productId)}">
                  <div class="z-cart-item-placeholder" aria-hidden="true">📦</div>
                  <div class="z-cart-item-info"><h3>${t("unavailable")}</h3><p>${escapeHTML(row.productId)}</p></div>
                  <button type="button" class="z-cart-remove" data-cart-remove="${escapeHTML(row.productId)}">${t("remove")}</button>
                </article>`;
              const image = product.image_url || "";
              return `
                <article class="z-cart-item" data-cart-row="${escapeHTML(row.productId)}">
                  ${image
                    ? `<img class="z-cart-product-image" src="${escapeHTML(image)}" alt="${escapeHTML(product.title || "Product")}" loading="lazy">`
                    : `<div class="z-cart-item-placeholder" aria-hidden="true">📦</div>`}
                  <div class="z-cart-item-info">
                    <h3>${escapeHTML(product.title || (language === "en" ? "Product" : "Bidhaa"))}</h3>
                    <strong class="z-cart-unit-price">${money(product.price, language)}</strong>
                    <div class="z-quantity-controls" role="group" aria-label="${t("quantity")}">
                      <button type="button" data-cart-minus="${escapeHTML(row.productId)}" aria-label="${t("decreaseQty")}" ${quantity <= 1 ? "disabled" : ""}>−</button>
                      <span aria-live="polite">${quantity}</span>
                      <button type="button" data-cart-plus="${escapeHTML(row.productId)}" aria-label="${t("increaseQty")}" ${quantity >= MAX_QTY ? "disabled" : ""}>+</button>
                    </div>
                  </div>
                  <div class="z-cart-item-end">
                    <strong class="z-cart-line-total">${money(row.lineTotal, language)}</strong>
                    <button type="button" class="z-cart-remove" data-cart-remove="${escapeHTML(row.productId)}">${t("remove")}</button>
                  </div>
                </article>`;
            }).join("")}
          </section>
          <aside class="z-cart-summary">
            <h2>${t("summary")}</h2>
            <div class="z-cart-summary-row"><span>${t("subtotal")}</span><strong data-cart-subtotal>${money(subtotal, language)}</strong></div>
            <div class="z-cart-summary-total"><span>${t("total")}</span><strong data-cart-total>${money(subtotal, language)}</strong></div>
            <button type="button" class="z-primary-button z-cart-checkout" data-cart-checkout>${t("checkout")}</button>
            <p class="z-cart-checkout-note">${t("checkoutNote")}</p>
            <button type="button" class="z-continue-shopping" data-cart-continue>${t("continue")}</button>
          </aside>
        </div>
      </main>
    </section>`;
}

/* ---------- Events (delegation + idempotent) ---------- */
const boundRoots = new WeakMap();

export function bindCartEvents(root = document, handlers = {}) {
  // Epuka kuunganisha listener mara mbili
  const prev = boundRoots.get(root);
  if (prev) prev();

  const onClick = event => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const minus = target.closest("[data-cart-minus]");
    if (minus && !minus.disabled) return handlers.onQuantityChange?.(minus.dataset.cartMinus, -1);

    const plus = target.closest("[data-cart-plus]");
    if (plus && !plus.disabled) return handlers.onQuantityChange?.(plus.dataset.cartPlus, 1);

    const remove = target.closest("[data-cart-remove]");
    if (remove) return handlers.onRemove?.(remove.dataset.cartRemove);

    if (target.closest("[data-cart-continue]")) return handlers.onContinueShopping?.();
    if (target.closest("[data-cart-checkout]")) return handlers.onCheckout?.();
    if (target.closest("[data-cart-retry]"))    return handlers.onRetry?.();
  };

  root.addEventListener("click", onClick);
  const unbind = () => {
    root.removeEventListener("click", onClick);
    if (boundRoots.get(root) === unbind) boundRoots.delete(root);
  };
  boundRoots.set(root, unbind);
  return unbind;
}

/* ---------- Standalone mount ---------- */
const mountedRoots = new WeakMap();

export async function mountStandaloneCart(root) {
  if (!root) return;

  // Cleanup mount ya awali (kama ipo) – muhimu kwa SPA
  const prev = mountedRoots.get(root);
  if (prev) prev();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user?.id) {
    root.innerHTML = '<p role="status">Tafadhali ingia kwenye akaunti yako kuona kikapu.</p>';
    return;
  }
  const userId = user.id;

  const language = localStorage.getItem(LANG_KEY) === "en" ? "en" : "sw";
  const theme = localStorage.getItem(THEME_KEY) || "emerald";
  document.documentElement.dataset.theme = theme;
  document.documentElement.lang = language;

  let cart = readCart(userId);
  const productsById = new Map();
  let renderToken = 0;

  syncCartCountBadges(cart);

  /* --- Rendering helpers --- */
  const renderFull = ({ loading = false, error = false } = {}) => {
    root.innerHTML = renderCartPage({
      cart,
      products: [...productsById.values()],
      language,
      loading,
      error
    });
  };

  const patchQuantity = (productId, quantity, product) => {
    const row = root.querySelector(`[data-cart-row="${CSS.escape(String(productId))}"]`);
    if (!row) return false;

    const span = row.querySelector(".z-quantity-controls span");
    if (span) span.textContent = String(quantity);

    const minus = row.querySelector("[data-cart-minus]");
    const plus  = row.querySelector("[data-cart-plus]");
    if (minus) minus.disabled = quantity <= 1;
    if (plus)  plus.disabled  = quantity >= MAX_QTY;

    const lineTotal = row.querySelector(".z-cart-line-total");
    if (lineTotal) lineTotal.textContent = money(Number(product.price || 0) * quantity, language);
    return true;
  };

  const patchSummary = () => {
    const { subtotal, count } = computeTotals(cart, [...productsById.values()]);
    const sub = root.querySelector("[data-cart-subtotal]");
    const tot = root.querySelector("[data-cart-total]");
    if (sub) sub.textContent = money(subtotal, language);
    if (tot) tot.textContent = money(subtotal, language);

    const heading = root.querySelector(".z-cart-heading p");
    if (heading) heading.textContent = `${count} ${text(language, "items")}`;
  };

  const allProductsLoaded = () =>
    cart.every(item => productsById.has(String(item.productId)));

  const ensureProductsLoaded = async () => {
    const missing = cart
      .map(i => String(i.productId))
      .filter(id => !productsById.has(id));
    if (!missing.length) return;

    const missingSet = new Set(missing);
    const partial = cart.filter(i => missingSet.has(String(i.productId)));
    const loaded = await loadCartProducts(partial); // inaweza kutupa
    for (const p of loaded) productsById.set(String(p.id), p);
  };

  /* --- Refresh (full render) --- */
  const refresh = async () => {
    const token = ++renderToken;
    cart = readCart(userId);

    if (!cart.length) {
      productsById.clear();
      renderFull();
      return;
    }

    const hasMissing = !allProductsLoaded();
    renderFull({ loading: hasMissing });

    if (hasMissing) {
      try {
        await ensureProductsLoaded();
        if (token !== renderToken) return; // refresh mpya imechukua nafasi

        const scrollY = window.scrollY;
        renderFull();
        window.scrollTo(0, scrollY);
      } catch (error) {
        if (token !== renderToken) return;
        console.error("ZUNE cart load error:", error);
        renderFull({ error: true });
      }
    }
  };

  /* --- Bind events --- */
  bindCartEvents(root, {
    onQuantityChange: (id, delta) => {
      const item = cart.find(r => String(r.productId) === String(id));
      if (!item) return;

      const next = Math.min(MAX_QTY, Math.max(1, Number(item.quantity || 1) + delta));
      if (next === item.quantity) return;

      item.quantity = next;
      cart = writeCart(cart, userId);

      if (allProductsLoaded()) {
        const product = productsById.get(String(id));
        if (patchQuantity(id, next, product)) {
          patchSummary();
        } else {
          renderFull(); // fallback
        }
      } else {
        refresh(); // bidhaa bado zinapakia – usifanye patch
      }
    },

    onRemove: id => {
      cart = writeCart(cart.filter(r => String(r.productId) !== String(id)), userId);

      if (!cart.length) {
        productsById.clear();
        renderFull();
        return;
      }

      if (allProductsLoaded()) {
        const row = root.querySelector(`[data-cart-row="${CSS.escape(String(id))}"]`);
        if (row) {
          row.remove();
          patchSummary();
        } else {
          renderFull();
        }
      } else {
        refresh();
      }
    },

    onContinueShopping: () => window.location.assign("./index.html"),
    onCheckout: () => alert(language === "en"
      ? "Checkout will be available soon."
      : "Mfumo wa malipo utaunganishwa baadaye."),
    onRetry: () => refresh()
  });

  /* --- Cross-tab sync --- */
  const onStorage = event => {
    if (event.key === CART_KEY) refresh();
  };
  window.addEventListener("storage", onStorage);

  /* --- Cleanup registration --- */
  mountedRoots.set(root, () => {
    window.removeEventListener("storage", onStorage);
    boundRoots.get(root)?.();
    mountedRoots.delete(root);
  });

  await refresh();
}