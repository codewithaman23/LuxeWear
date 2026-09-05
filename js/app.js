const products = [
  { id: "tee-01", name: "Essential heavyweight tee", category: "tshirts", price: 799, oldPrice: 1199, image: "image/TSHIRT-1.avif", secondaryImage: "image/TSHIRT-4.avif", colour: "Ink black", rating: 4.8, reviews: 128, badge: "Best seller", sizes: "XS–XXL" },
  { id: "tee-02", name: "Sunday club tee", category: "tshirts", price: 899, oldPrice: 1299, image: "image/TSHIRT-2.avif", secondaryImage: "image/TSHIRT-5.avif", colour: "Cloud white", rating: 4.7, reviews: 86, badge: "New", sizes: "XS–XL" },
  { id: "tee-03", name: "Daily uniform tee", category: "tshirts", price: 749, oldPrice: 999, image: "image/TSHIRT-3.avif", secondaryImage: "image/TSHIRT-6.avif", colour: "Stone", rating: 4.6, reviews: 64, badge: "Everyday", sizes: "S–XXL" },
  { id: "hoodie-01", name: "Relaxed brushed hoodie", category: "hoodies", price: 1499, oldPrice: 1999, image: "image/HOODIE-1.avif", secondaryImage: "image/HOODIE-4.avif", colour: "Charcoal", rating: 4.9, reviews: 214, badge: "Best seller", sizes: "S–XXL" },
  { id: "hoodie-02", name: "Studio zip hoodie", category: "hoodies", price: 1699, oldPrice: 2199, image: "image/HOODIE-2.avif", secondaryImage: "image/HOODIE-5.avif", colour: "Ash", rating: 4.8, reviews: 93, badge: "New", sizes: "XS–XL" },
  { id: "shirt-01", name: "Relaxed camp collar shirt", category: "shirts", price: 1299, oldPrice: 1799, image: "image/shirt-1.avif", secondaryImage: "image/shirt-4.avif", colour: "Olive", rating: 4.7, reviews: 51, badge: "Limited", sizes: "S–XL" },
  { id: "shirt-02", name: "Resort stripe shirt", category: "shirts", price: 1199, oldPrice: 1599, image: "image/shirt-2.avif", secondaryImage: "image/shirt-5.avif", colour: "Blue stripe", rating: 4.6, reviews: 42, badge: "Summer edit", sizes: "S–XXL" },
  { id: "hoodie-03", name: "Heavyweight everyday hoodie", category: "hoodies", price: 1799, oldPrice: 2499, image: "image/HOODIE-3.avif", secondaryImage: "image/HOODIE-6.avif", colour: "Moss", rating: 4.8, reviews: 77, badge: "Staff pick", sizes: "S–XXL" }
];

const read = (key) => JSON.parse(localStorage.getItem(key) || "[]");
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const money = (value) => `₹${value.toLocaleString("en-IN")}`;

function updateCounts() {
  const cart = read("noir-cart");
  const wishlist = read("noir-wishlist");
  document.querySelectorAll("[data-cart-count]").forEach((node) => { node.textContent = cart.reduce((sum, item) => sum + item.quantity, 0); });
  document.querySelectorAll("[data-wishlist-count]").forEach((node) => { node.textContent = wishlist.length; });
}

function productCard(product) {
  const saved = read("noir-wishlist").includes(product.id);
  const discount = Math.round((1 - product.price / product.oldPrice) * 100);
  return `<article class="product-card" data-product="${product.id}">
    <div class="product-image"><a href="product.html?id=${product.id}" aria-label="View ${product.name}"><img src="${product.image}" data-secondary="${product.secondaryImage}" alt="${product.name}" loading="lazy"></a><span class="product-badge">${product.badge}</span><button class="wish-button ${saved ? "is-saved" : ""}" data-wishlist="${product.id}" aria-label="${saved ? "Remove from" : "Add to"} wishlist">${saved ? "♥" : "♡"}</button><button class="quick-view" data-quick-view="${product.id}" type="button">Quick view</button></div>
    <div class="product-info"><div class="product-title-row"><h3>${product.name}</h3><span class="product-colour">${product.colour}</span></div><div class="rating" aria-label="${product.rating} out of 5 stars"><span>★★★★★</span> ${product.rating} <small>(${product.reviews})</small></div><div class="product-meta"><span class="price">${money(product.price)}</span><span class="old-price">${money(product.oldPrice)}</span><span class="discount">${discount}% off</span></div><div class="product-footer"><span class="sizes">Sizes ${product.sizes}</span><button class="button button-dark add-product" data-add="${product.id}">Add to bag <span>+</span></button></div></div>
  </article>`;
}

function renderGrid() {
  const grid = document.querySelector("[data-product-grid]");
  if (!grid) return;
  const query = new URLSearchParams(location.search);
  const selectedCategories = [...document.querySelectorAll("[data-filter-category]:checked")].map((input) => input.value);
  const price = document.querySelector("[data-filter-price]:checked")?.value || "all";
  let visible = products.filter((product) => {
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);
    const matchesPrice = price === "all" || (price === "under" ? product.price < 1000 : product.price >= 1000);
    const search = document.querySelector("[data-search]")?.value.trim().toLowerCase() || "";
    return matchesCategory && matchesPrice && (!search || `${product.name} ${product.colour}`.toLowerCase().includes(search));
  });
  if (query.get("category")) visible = visible.filter((product) => product.category === query.get("category"));
  if (query.get("sale") === "true") visible = visible.filter((product) => product.price < product.oldPrice);
  const sort = document.querySelector("[data-sort]")?.value;
  if (sort === "low") visible.sort((a, b) => a.price - b.price);
  if (sort === "high") visible.sort((a, b) => b.price - a.price);
  const limit = Number(grid.dataset.limit || visible.length);
  grid.innerHTML = visible.slice(0, limit).map(productCard).join("");
  const count = document.querySelector("[data-results-count]");
  if (count) count.textContent = visible.length;
  const empty = document.querySelector("[data-empty]");
  if (empty) empty.hidden = visible.length > 0;
}

function addToCart(id) {
  const cart = read("noir-cart");
  const item = cart.find((entry) => entry.id === id);
  if (item) item.quantity += 1; else cart.push({ id, quantity: 1 });
  write("noir-cart", cart);
  updateCounts();
  showToast("Added to your bag");
}

function showToast(message) {
  let toast = document.querySelector("[data-toast]");
  if (!toast) {
    toast = document.createElement("div");
    toast.dataset.toast = "true";
    toast.className = "toast";
    document.body.append(toast);
  }

  function showQuickView(id) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    const modal = document.createElement("div");
    modal.className = "quick-modal";
    modal.innerHTML = `<div class="quick-modal-card" role="dialog" aria-modal="true" aria-label="${product.name} quick view"><button class="quick-close" type="button" aria-label="Close quick view">×</button><img src="${product.image}" alt="${product.name}"><div><p class="eyebrow">${product.badge} · ${product.colour}</p><h2>${product.name}</h2><div class="rating"><span>★★★★★</span> ${product.rating} <small>(${product.reviews})</small></div><p class="quick-price">${money(product.price)} <s>${money(product.oldPrice)}</s></p><p class="quick-description">A considered everyday layer with a relaxed fit and soft hand feel.</p><button class="button button-dark" data-add="${product.id}">Add to bag <span>+</span></button></div></div>`;
    document.body.append(modal);
    const close = () => modal.remove();
    modal.addEventListener("click", (event) => { if (event.target === modal || event.target.closest(".quick-close")) close(); });
    modal.querySelector("[data-add]").addEventListener("click", (event) => { event.stopPropagation(); addToCart(id); close(); });
  }

  document.addEventListener("pointerover", (event) => {
    const image = event.target.closest(".product-image img[data-secondary]");
    if (image && image.dataset.original) return;
    if (image) { image.dataset.original = image.src; image.src = image.dataset.secondary; }
  });
  document.addEventListener("pointerout", (event) => {
    const image = event.target.closest(".product-image img[data-secondary]");
    if (image?.dataset.original && !image.parentElement.matches(":hover")) { image.src = image.dataset.original; delete image.dataset.original; }
  });
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(window.noirToastTimer);
  window.noirToastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function toggleWishlist(id) {
  const wishlist = read("noir-wishlist");
  const next = wishlist.includes(id) ? wishlist.filter((item) => item !== id) : [...wishlist, id];
  write("noir-wishlist", next);
  updateCounts();
  renderGrid();
}

function setupCartPage() {
  const list = document.querySelector("[data-cart-list]");
  if (!list) return;
  const render = () => {
    const cart = read("noir-cart");
    list.innerHTML = cart.length ? cart.map((item) => {
      const product = products.find((entry) => entry.id === item.id);
      return `<div class="cart-row"><img src="${product.image}" alt="${product.name}"><div><h3>${product.name}</h3><p class="eyebrow">${money(product.price)} · ${product.colour}</p></div><div class="quantity"><button data-quantity="${product.id}" data-change="-1" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button data-quantity="${product.id}" data-change="1" aria-label="Increase quantity">+</button></div><button class="remove" data-remove="${product.id}">Remove</button></div>`;
    }).join("") : `<div class="empty-state">Your bag is waiting for something good.<br><br><a class="under-link" href="streetwear.html">Continue shopping →</a></div>`;
    const subtotal = cart.reduce((sum, item) => sum + products.find((product) => product.id === item.id).price * item.quantity, 0);
    const subtotalNode = document.querySelector("[data-subtotal]");
    if (subtotalNode) subtotalNode.textContent = money(subtotal);
    const totalNode = document.querySelector("[data-total]");
    if (totalNode) totalNode.textContent = money(subtotal);
    updateCounts();
  };
  list.addEventListener("click", (event) => {
    const target = event.target.closest("[data-quantity], [data-remove]");
    if (!target) return;
    const cart = read("noir-cart");
    const id = target.dataset.quantity || target.dataset.remove;
    const item = cart.find((entry) => entry.id === id);
    if (target.dataset.remove || (item && item.quantity + Number(target.dataset.change) < 1)) write("noir-cart", cart.filter((entry) => entry.id !== id));
    else { item.quantity += Number(target.dataset.change); write("noir-cart", cart); }
    render();
  });
  render();
}

document.addEventListener("click", (event) => {
  const add = event.target.closest("[data-add]");
  const wish = event.target.closest("[data-wishlist]");
  const quick = event.target.closest("[data-quick-view]");
  if (add) addToCart(add.dataset.add);
  if (wish) toggleWishlist(wish.dataset.wishlist);
  if (quick) showQuickView(quick.dataset.quickView);
  const clear = event.target.closest("[data-clear-filters]");
  if (clear) { document.querySelectorAll("[data-filter-category]").forEach((input) => { input.checked = false; }); document.querySelector('[data-filter-price][value="all"]')?.click(); renderGrid(); }
});
document.querySelectorAll("[data-filter-category], [data-filter-price], [data-sort]").forEach((control) => control.addEventListener("change", renderGrid));
document.querySelectorAll("[data-search]").forEach((input) => input.addEventListener("input", renderGrid));
document.querySelectorAll(".menu-toggle").forEach((button) => button.addEventListener("click", () => { const nav = document.querySelector(".main-nav"); nav.classList.toggle("is-open"); button.setAttribute("aria-expanded", nav.classList.contains("is-open")); }));
document.querySelectorAll("[data-newsletter]").forEach((form) => form.addEventListener("submit", (event) => { event.preventDefault(); form.reset(); form.parentElement.querySelector("[data-form-message]").textContent = "You're on the list — see you soon."; }));
document.addEventListener("DOMContentLoaded", () => { renderGrid(); setupCartPage(); updateCounts(); });
