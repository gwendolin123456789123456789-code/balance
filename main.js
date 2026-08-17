// ============================================================
//  BALANCE STORE — main.js
//  Para cambiar la fuente de datos, reemplazá el valor de
//  SHEET_CSV_URL con el link que te da Google al publicar tu
//  hoja como CSV.
// ============================================================

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1YKQmLbrByaNTubBGNJzjin3GHz2nV5QwBKs4PIzaGwA9fFc4N6h_C_hBlI4NhSDWbpEKghJz_hPc/pub?gid=0&single=true&output=csv"; // 👈 Pegá aquí el link de tu Google Sheets publicado como CSV

// Mapa global: id → objeto producto (evita pasar JSON en atributos HTML)
window.productMap = {};

// Productos de ejemplo que se usan si todavía no configuraste Google Sheets
const DEMO_PRODUCTS = [

// ============================================================
//  Parseo de CSV
// ============================================================
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    // Manejar comas dentro de comillas
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += char; }
    }
    values.push(current.trim());

    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || "").replace(/^"|"$/g, "").trim(); });
    return obj;
  });
}

// ============================================================
//  Carga de productos (Google Sheets o demo)
// ============================================================
async function loadProducts() {
  if (!SHEET_CSV_URL) {
    return DEMO_PRODUCTS;
  }
  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error("No se pudo cargar el CSV");
    const text = await res.text();
    const rows = parseCSV(text);
    return rows
      .filter(r => r.stock === "activo" && r.nombre)
      .map(r => ({
        ...r,
        precio: parseFloat(r.precio) || 0,
        precio_original: r.precio_original ? parseFloat(r.precio_original) : ""
      }));
  } catch (e) {
    console.warn("Error cargando Google Sheets, usando demo:", e);
    return DEMO_PRODUCTS;
  }
}

// ============================================================
//  Renderizado de productos en la tienda (index.html)
// ============================================================
function renderProducts(products) {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  grid.innerHTML = "";

  if (products.length === 0) {
    grid.innerHTML = `<p class="col-span-full text-center text-on-surface-variant py-16">No hay productos disponibles en este momento.</p>`;
    return;
  }

  // Categorías únicas para el sidebar
  const cats = [...new Set(products.map(p => p.categoria).filter(Boolean))];
  const catList = document.getElementById("category-list");
  if (catList) {
    catList.innerHTML = cats.map(c => `
      <li>
        <a class="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer category-link" data-cat="${c}" href="#">
          ${c} <span class="text-xs">${products.filter(p => p.categoria === c).length}</span>
        </a>
      </li>
    `).join("");
    // Filtro por categoría
    catList.querySelectorAll(".category-link").forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        catList.querySelectorAll(".category-link").forEach(l => l.classList.remove("text-primary", "font-bold"));
        link.classList.add("text-primary", "font-bold");
        const filtered = products.filter(p => p.categoria === link.dataset.cat);
        renderProductCards(filtered, grid);
      });
    });
  }

  // Marcas únicas para los filtros
  const brands = [...new Set(products.map(p => p.marca).filter(Boolean))];
  const brandList = document.getElementById("brand-list");
  if (brandList) {
    brandList.innerHTML = brands.map(b => `
      <label class="flex items-center gap-2 cursor-pointer brand-filter">
        <input class="rounded text-primary focus:ring-primary w-4 h-4 border-outline" type="checkbox" value="${b}">
        <span class="font-body-md text-body-md text-on-surface-variant">${b}</span>
      </label>
    `).join("");
    // Filtro por marca
    brandList.querySelectorAll("input").forEach(cb => {
      cb.addEventListener("change", () => {
        const selected = [...brandList.querySelectorAll("input:checked")].map(i => i.value);
        const filtered = selected.length ? products.filter(p => selected.includes(p.marca)) : products;
        renderProductCards(filtered, grid);
      });
    });
  }

  // Búsqueda
  const searchInputs = document.querySelectorAll(".search-input");
  searchInputs.forEach(input => {
    input.addEventListener("input", () => {
      const q = input.value.toLowerCase();
      const filtered = q ? products.filter(p => p.nombre.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q)) : products;
      renderProductCards(filtered, grid);
    });
  });

  renderProductCards(products, grid);
}

function renderProductCards(products, grid) {
  grid.innerHTML = "";
  if (products.length === 0) {
    grid.innerHTML = `<p class="col-span-full text-center text-on-surface-variant py-10">No se encontraron productos.</p>`;
    return;
  }
  // Guardar en mapa global para acceso seguro desde onclick
  products.forEach(p => { window.productMap[p.id] = p; });

  products.forEach(p => {
    const badge = p.badge ? `<span class="bg-error text-on-error text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">${p.badge}</span>` : "";
    const oldPrice = p.precio_original ? `<span class="text-xs text-on-surface-variant line-through">${formatPrice(p.precio_original)}</span>` : "";
    grid.innerHTML += `
      <div class="group bg-surface-container-lowest rounded-xl overflow-hidden ambient-shadow transition-all duration-300 hover:-translate-y-1">
        <div class="relative h-64 overflow-hidden">
          <img alt="${p.nombre}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
               src="${p.imagen_url || 'https://placehold.co/400x300?text=Imagen'}"
               onerror="this.src='https://placehold.co/400x300?text=${encodeURIComponent(p.nombre)}'">
          ${p.badge ? `<div class="absolute top-2.5 left-3">${badge}</div>` : ""}
        </div>
        <div class="p-4 flex flex-col gap-2">
          <div>
            ${p.marca ? `<p class="text-xs text-on-surface-variant font-label-sm uppercase tracking-wider">${p.marca}</p>` : ""}
            <h3 class="font-headline-md text-on-surface text-lg">${p.nombre}</h3>
          </div>
          <p class="text-sm text-on-surface-variant line-clamp-2">${p.descripcion}</p>
          <div class="mt-2 flex items-center justify-between">
            <div class="flex flex-col">
              ${oldPrice}
              <span class="text-headline-md text-primary font-bold">${formatPrice(p.precio)}</span>
            </div>
            <button onclick="addToCartById('${p.id}')" class="bg-primary text-on-primary p-2 rounded-full hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center">
              <span class="material-symbols-outlined">add_shopping_cart</span>
            </button>
          </div>
        </div>
      </div>
    `;
  });
}

// ============================================================
//  Carrito
// ============================================================
function getCart() {
  return JSON.parse(localStorage.getItem("balance_cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("balance_cart", JSON.stringify(cart));
  updateCartBadge();
}

function addToCartById(id) {
  const productData = window.productMap[id];
  if (!productData) { console.error('Producto no encontrado:', id); return; }
  let cart = getCart();
  let existing = cart.find(i => i.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...productData, quantity: 1 });
  }
  saveCart(cart);
  showToast(`¡${productData.nombre} agregado al carrito!`);
}

function updateCartBadge() {
  const cart = getCart();
  const total = cart.reduce((s, i) => s + i.quantity, 0);
  document.querySelectorAll("#cart-badge").forEach(b => {
    b.textContent = total;
    b.style.display = total > 0 ? "flex" : "none";
  });
}

function removeFromCart(id) {
  saveCart(getCart().filter(i => i.id !== id));
  renderCart();
}

function changeQuantity(id, delta) {
  let cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) cart = cart.filter(i => i.id !== id);
  }
  saveCart(cart);
  renderCart();
}

function renderCart() {
  const container = document.getElementById("cart-items");
  if (!container) return;
  const cart = getCart();
  container.innerHTML = "";

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-16 gap-4 text-on-surface-variant">
        <span class="material-symbols-outlined text-6xl opacity-30">shopping_cart</span>
        <p class="font-headline-md text-headline-md opacity-50">Tu carrito está vacío</p>
        <a href="index.html" class="bg-primary text-on-primary px-6 py-3 rounded-full font-label-md text-label-md hover:bg-primary/90 transition-all">Ir a la tienda</a>
      </div>`;
    updateTotals(0, 0);
    return;
  }

  let subtotal = 0;
  let totalItems = 0;
  cart.forEach(item => {
    const itemTotal = item.precio * item.quantity;
    subtotal += itemTotal;
    totalItems += item.quantity;
    container.innerHTML += `
      <div class="bg-surface-container-lowest rounded-xl p-md ambient-shadow flex flex-col gap-sm relative group overflow-hidden">
        <button onclick="removeFromCart('${item.id}')" class="absolute top-sm right-sm text-outline hover:text-error transition-colors p-1 rounded-full hover:bg-error-container/50">
          <span class="material-symbols-outlined text-xl">close</span>
        </button>
        <div class="flex gap-md items-start">
          <div class="w-24 h-24 rounded-lg bg-surface-container overflow-hidden shrink-0">
            <img class="w-full h-full object-cover" src="${item.imagen_url || ''}"
                 onerror="this.src='https://placehold.co/200?text=${encodeURIComponent(item.nombre)}'">
          </div>
          <div class="flex flex-col gap-xs flex-grow">
            <h3 class="font-headline-md text-on-surface text-lg leading-tight">${item.nombre}</h3>
            ${item.marca ? `<p class="font-label-sm text-label-sm text-on-surface-variant">${item.marca}</p>` : ""}
            <p class="font-headline-md text-primary text-xl mt-auto">${formatPrice(item.precio)}</p>
          </div>
        </div>
        <div class="flex items-center justify-between border-t border-surface-variant pt-sm mt-auto">
          <div class="flex items-center gap-xs bg-surface-container-low rounded-full p-1">
            <button onclick="changeQuantity('${item.id}', -1)" class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors">
              <span class="material-symbols-outlined text-sm">remove</span>
            </button>
            <span class="font-label-md text-on-surface w-6 text-center">${item.quantity}</span>
            <button onclick="changeQuantity('${item.id}', 1)" class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors">
              <span class="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
          <p class="font-label-md text-on-surface-variant">Subtotal: <span class="font-headline-md text-on-background text-lg">${formatPrice(itemTotal)}</span></p>
        </div>
      </div>`;
  });
  updateTotals(subtotal, totalItems);
}

function updateTotals(subtotal, totalItems) {
  const el = id => document.getElementById(id);
  if (el("cart-items-count-text")) el("cart-items-count-text").textContent = `Subtotal (${totalItems} artículo${totalItems !== 1 ? "s" : ""})`;
  if (el("cart-subtotal")) el("cart-subtotal").textContent = formatPrice(subtotal);
  if (el("cart-total")) el("cart-total").textContent = formatPrice(subtotal);
}

function checkout() {
  const cart = getCart();
  if (cart.length === 0) { showToast("Tu carrito está vacío.", true); return; }
  const name = document.getElementById("name")?.value?.trim();
  const notes = document.getElementById("notes")?.value?.trim();
  if (!name) { showToast("Por favor ingresá tu nombre completo.", true); return; }

  let total = 0;
  let msg = `Hola Balance! Soy *${name}* y quiero hacer el siguiente pedido:\n\n`;
  cart.forEach(item => {
    const sub = item.precio * item.quantity;
    total += sub;
    msg += `• ${item.quantity}x *${item.nombre}* — ${formatPrice(sub)}\n`;
  });
  msg += `\n*Total estimado: ${formatPrice(total)}*`;
  if (notes) msg += `\n\n📝 Notas: ${notes}`;

  const phone = "5491112345678"; // Reemplazá con el número real de WhatsApp del negocio
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
}

// ============================================================
//  Utilidades
// ============================================================
function formatPrice(price) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(price);
}

function showToast(msg, isError = false) {
  const existing = document.getElementById("toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "toast";
  toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-full shadow-lg font-label-md text-label-md text-white transition-all duration-300 ${isError ? "bg-error" : "bg-primary"}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 2800);
}

// ============================================================
//  Inicio
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  updateCartBadge();

  // Cargar y renderizar productos si estamos en la tienda
  if (document.getElementById("product-grid")) {
    const loadingEl = document.getElementById("products-loading");
    if (loadingEl) loadingEl.style.display = "flex";
    const products = await loadProducts();
    if (loadingEl) loadingEl.style.display = "none";
    renderProducts(products);
  }

  // Renderizar carrito si estamos en esa página
  renderCart();
});
