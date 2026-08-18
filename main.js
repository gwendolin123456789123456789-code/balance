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
  {
    id: "barra-integra",
    nombre: "Barra Integra",
    marca: "Integra",
    descripcion: "Barra de chocolate con avellanas. Snack saludable y nutritivo.",
    precio: 2000,
    precio_original: 2300,
    imagen_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHOkg7D2Sa8NcBcL3seaej2mr1YBwhQN1skcwORoKm-MUSkem89flLlKzymcbj58yuOg-X94a775p0tsJlPya7PWb8gz6ofM92aDc3yPKg3PnqHaLu1g0EKiv2F4YC3NSQ6ZPjOEezjkwz0CQh41a_UWt917RgmXjT64n51AAjBwvAbC36xzj--IaITxp90y-dAhVCPHzp8z521AzSbceTdhI96KrnorbWrCL9h3NTHidF45UhIlmb2t-XNoqYTM6gNw",
    categoria: "Snacks Saludables",
    badge: "OFERTA",
    stock: "activo"
  },
  {
    id: "miel-organica",
    nombre: "Miel Orgánica de Prado",
    marca: "Sin Marca",
    descripcion: "Miel pura orgánica. Frasco de 500g cosechado artesanalmente.",
    precio: 4500,
    precio_original: "",
    imagen_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAeDYLflRNNVKfUyDme6HTtYiSRIpVbdJl83o8iPuNw1Sk9DTqML7_ttsg_vabjQIXUeMOnpCKiqkHJXllL_FN_NZUNCpHEH3M03ActGxnaaVGtPoUfUYAR1tUG8CakuYAMG-Q4xa8h7Yf1ZVxWGlhlnzfXkucMHK7_kEblzqS8DFqlfLzU7cAV5aqkU8NF7jwcXwwlNHlM7q8CR3GSYdk-WwNfSyI3_2hBGZ_7zAbkDO5vVj8XHI95",
    categoria: "Harinas Orgánicas",
    badge: "",
    stock: "activo"
  },
  {
    id: "mix-frutos",
    nombre: "Mix Frutos Secos Premium",
    marca: "EntreNuts",
    descripcion: "La combinación perfecta de almendras, nueces y castañas.",
    precio: 3200,
    precio_original: "",
    imagen_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBBQ7A0WPJMRm1hDdYEcecet4XPKLw7d9i8y6FfNuokYmi0qm7eYm_8IoW37CE_9C4SW-VYt_l9kDmJU17K8Rw9R-Q_WUAaJSJA7U6Z4zsUbRBHmn6-99pOMOAgsPmU4qh5dKl5BHIJ5DSeiXSloQih2Q55facri1I2_t6cKSdVEXvU_HqHkclFff0bttlOX4scqJ9c3y1vP7OmXsWOKKb9xfEYScctr-t623R-i07OpkMjI6WhTAk2",
    categoria: "Secos",
    badge: "Novedad",
    stock: "activo"
  },
  {
    id: "jugo-detox",
    nombre: "Jugo Detox Verde Cold-Pressed",
    marca: "Sin Marca",
    descripcion: "Botella de vidrio 500ml. Prensado en frío, sin conservantes.",
    precio: 2800,
    precio_original: "",
    imagen_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCdpqapfqgpwzvdOxb5y3FdGvQLnkZ-45ZMYMpMIMOr-RntUiMy1ilPaUXE7pU3B62po0bCHsu4szVbkPCWV-E8bhBh_iXo0dyH-VQzOETg-OAVeMvn86YhldDF1V6_natEXedIShfDcA-avhDyiBLD7in4wRVCTFSZM7Xu61NTvm1Kw7J_UGVoPS24JN5_DsGDVHdU66aAspe-tEJj-nrWmxFJTm_tEiMGAkp8oxyx_D09CGergK-0",
    categoria: "Snacks Saludables",
    badge: "",
    stock: "activo"
  }
];

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

  // Categorías únicas para el sidebar/filtros
  const cats = [...new Set(products.map(p => p.categoria).filter(Boolean))];
  const catList = document.getElementById("category-list");
  
  if (catList) {
    const activeClass = "px-6 py-2 rounded-full border border-charcoal-slate bg-charcoal-slate text-linen-cream font-label-md text-label-md uppercase tracking-widest transition-colors";
    const inactiveClass = "px-6 py-2 rounded-full border-[0.5px] border-charcoal-slate bg-transparent text-charcoal-slate font-label-md text-label-md uppercase tracking-widest hover:bg-muted-sage hover:border-muted-sage hover:text-linen-cream transition-colors";
    
    catList.innerHTML = `
      <button class="${activeClass} category-link" data-cat="all">Todos</button>
      ` + cats.map(c => `
      <button class="${inactiveClass} category-link" data-cat="${c}">${c}</button>
    `).join("");

    // Filtro por categoría
    catList.querySelectorAll(".category-link").forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        // Reset styles
        catList.querySelectorAll(".category-link").forEach(b => {
          b.className = `${inactiveClass} category-link`;
        });
        // Set active style
        btn.className = `${activeClass} category-link`;
        
        const cat = btn.dataset.cat;
        const filtered = (cat === "all") ? products : products.filter(p => p.categoria === cat);
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
    const badge = p.badge ? `<div class="absolute top-1 left-1 md:top-4 md:left-4 z-10"><span class="px-1 py-0.5 md:px-3 md:py-1 rounded-full border-[0.5px] border-charcoal-slate text-charcoal-slate font-label-sm text-[8px] md:text-label-sm uppercase bg-surface/50 backdrop-blur-sm">${p.badge}</span></div>` : "";
    grid.innerHTML += `
      <article class="border border-muted-sage/30 bg-linen-cream p-2 md:p-8 group flex flex-col h-full transition-transform hover:-translate-y-1 duration-300 relative cursor-pointer">
        <div class="aspect-square mb-2 md:mb-8 relative border border-muted-sage/10 bg-off-white overflow-hidden" onclick="openModal('${p.id}')">
          <img class="w-full h-full object-cover opacity-90 mix-blend-multiply group-hover:scale-105 transition-transform duration-700" alt="${p.nombre}" src="${p.imagen_url || 'https://placehold.co/400x300?text=Imagen'}" onerror="this.src='https://placehold.co/400x300?text=${encodeURIComponent(p.nombre)}'">
          ${badge}
        </div>
        <div class="flex-grow flex flex-col justify-between">
          <div onclick="openModal('${p.id}')">
            <h3 class="font-headline-md text-xs md:text-headline-md text-charcoal-slate mb-1 md:mb-2 leading-tight">${p.nombre}</h3>
            <p class="font-body-md text-[10px] md:text-body-md text-secondary mb-2 md:mb-4 line-clamp-2 md:line-clamp-3 leading-tight hidden sm:block">${p.descripcion}</p>
          </div>
          <div class="flex items-end justify-between mt-2 md:mt-6">
            <span class="font-headline-md text-sm md:text-headline-md text-charcoal-slate font-semibold">${formatPrice(p.precio)}</span>
            <button onclick="addToCartById('${p.id}'); event.stopPropagation();" class="w-7 h-7 md:w-12 md:h-12 rounded-full border border-charcoal-slate flex items-center justify-center text-charcoal-slate hover:bg-muted-sage hover:border-muted-sage hover:text-linen-cream transition-colors group-hover:bg-charcoal-slate group-hover:text-linen-cream z-20">
              <span class="material-symbols-outlined text-[16px] md:text-[24px]">add</span>
            </button>
          </div>
        </div>
      </article>
    `;
  });
}

// ============================================================
//  Modal de Producto
// ============================================================
function openModal(id) {
  const p = window.productMap[id];
  if(!p) return;
  
  document.getElementById('modal-img').src = p.imagen_url || 'https://placehold.co/400x300?text=Imagen';
  document.getElementById('modal-title').textContent = p.nombre;
  document.getElementById('modal-category').textContent = p.marca || p.categoria || '';
  document.getElementById('modal-desc').textContent = p.descripcion;
  document.getElementById('modal-price').textContent = formatPrice(p.precio);
  
  const addBtn = document.getElementById('modal-add-btn');
  addBtn.onclick = () => {
    addToCartById(p.id);
    closeModal();
  };
  
  const modal = document.getElementById('product-modal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    document.getElementById('product-modal-content').classList.remove('scale-95');
  }, 10);
}

function closeModal() {
  const modal = document.getElementById('product-modal');
  modal.classList.add('opacity-0');
  document.getElementById('product-modal-content').classList.add('scale-95');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }, 300);
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
      <div class="flex items-center gap-4 p-4 wireframe-border bg-linen-cream relative">
        <div class="w-20 h-20 flex-shrink-0 border border-outline-variant/30 overflow-hidden bg-off-white">
          <img class="w-full h-full object-cover mix-blend-multiply" alt="${item.nombre}" src="${item.imagen_url || ''}" onerror="this.src='https://placehold.co/200?text=${encodeURIComponent(item.nombre)}'">
        </div>
        <div class="flex-grow flex flex-col justify-between h-20">
          <div>
            <h3 class="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-1 line-clamp-1">${item.nombre}</h3>
            <p class="font-body-md text-body-md text-on-surface-variant">${formatPrice(itemTotal)}</p>
          </div>
          <div class="flex items-center justify-between mt-auto">
            <div class="flex items-center border border-charcoal-slate/30 rounded-sm">
              <button onclick="changeQuantity('${item.id}', -1)" class="w-8 h-8 flex items-center justify-center text-charcoal-slate hover:bg-muted-sage/10 transition-colors">
                <span class="material-symbols-outlined text-[16px]">remove</span>
              </button>
              <span class="w-8 text-center font-label-md text-label-md">${item.quantity}</span>
              <button onclick="changeQuantity('${item.id}', 1)" class="w-8 h-8 flex items-center justify-center text-charcoal-slate hover:bg-muted-sage/10 transition-colors">
                <span class="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>
          </div>
        </div>
        <button onclick="removeFromCart('${item.id}')" class="absolute top-4 right-4 text-outline hover:text-error transition-colors">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    `;
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

  const phone = "5491154922392"; // Reemplazá con el número real de WhatsApp del negocio
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
