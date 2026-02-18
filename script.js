/* =============================================
   SK'SHOPS — script.js
   ============================================= */

/* ── Auth state ─────────────────────────────── */
const AUTH_KEY = "skshops_user";

function getCurrentUser() {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function updateAccountNav() {
    const user = getCurrentUser();
    const label = document.getElementById("accountNavLabel");
    if (label && user) {
        label.textContent = user.prenom || "Mon compte";
    }
}

updateAccountNav();

/* ── Chargement produits admin ─────────────── */
(function loadAdminProducts() {
    const PROD_KEY = "skshops_products";
    const raw = localStorage.getItem(PROD_KEY);
    if (!raw) return;
    let adminProducts;
    try { adminProducts = JSON.parse(raw); } catch { return; }
    if (!Array.isArray(adminProducts) || adminProducts.length === 0) return;

    const grids = { nouveautes: document.getElementById("nouveautesGrid"), vetements: document.getElementById("vetementsGrid"), chaussures: document.getElementById("chaussuresGrid") };
    const used = { nouveautes: false, vetements: false, chaussures: false };

    const available = adminProducts.filter(p => p.available !== false);

    // Vider les grilles si des produits admin existent
    if (available.length > 0) {
        Object.values(grids).forEach(g => { if (g) g.innerHTML = ""; });
    }

    available.forEach(p => {
        const card = createProductCard(p);
        if (p.cat === "vetements" && grids.vetements) {
            grids.vetements.appendChild(card);
        } else if (p.cat === "chaussures" && grids.chaussures) {
            grids.chaussures.appendChild(card);
        } else if (grids.nouveautes) {
            grids.nouveautes.appendChild(card);
        }
    });
})();

function createProductCard(p) {
    const div = document.createElement("div");
    div.className = "product-card";
    div.dataset.id = p.id;
    div.innerHTML = `
        <div class="card-img">
            ${p.img ? `<img src="${p.img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" onerror="this.remove()">` : ''}
            <div class="card-placeholder">${p.emoji || "👗"}</div>
            ${p.badge ? `<div class="card-badge ${p.badge==='Bestseller'?'bestseller':p.badge==='Promo'?'promo':''}">${p.badge}</div>` : ''}
            <div class="card-actions-overlay">
                <button class="quick-view-btn" onclick="quickView(${p.id},'${p.name.replace(/'/g,"\\'")}',${p.price},'${p.emoji||"👗"}','${p.cat||""}')">👁 Aperçu</button>
                <button class="wishlist-btn" onclick="toggleWishlist(${p.id})">♡</button>
            </div>
        </div>
        <div class="card-body">
            <span class="card-cat">${p.cat || "Mode"}</span>
            <h3>${p.name}</h3>
            <div class="card-footer">
                <span class="price">${p.price.toLocaleString("fr-FR")} FCFA</span>
                <button class="btn-add-cart" onclick="addToCart(${p.id},'${p.name.replace(/'/g,"\\'")}',${p.price},'${p.emoji||"👗"}')">+ Panier</button>
            </div>
        </div>
    `;
    return div;
}

/* ── Panier ─────────────────────────────────── */
let cart = JSON.parse(localStorage.getItem("skshops_cart") || "[]");

function saveCart() { localStorage.setItem("skshops_cart", JSON.stringify(cart)); }

function addToCart(id, name, price, emoji = "👗") {
    const existing = cart.find(i => i.id === id);
    if (existing) existing.qty++;
    else cart.push({ id, name, price, emoji, qty: 1 });
    saveCart();
    updateCartUI();
    openCart();
    showToast("✅ " + name + " ajouté au panier !");
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    saveCart(); updateCartUI();
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) removeFromCart(id);
    else { saveCart(); updateCartUI(); }
}

function updateCartUI() {
    const count = cart.reduce((s, i) => s + i.qty, 0);
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    document.getElementById("cartCount").textContent = count;

    const itemsEl = document.getElementById("cartItems");
    const footerEl = document.getElementById("cartFooter");
    const totalEl = document.getElementById("cartTotal");

    if (cart.length === 0) {
        itemsEl.innerHTML = '<p class="cart-empty">Votre panier est vide 🛍️</p>';
        footerEl.style.display = "none";
        return;
    }

    footerEl.style.display = "block";
    totalEl.textContent = total.toLocaleString("fr-FR") + " FCFA";

    let waMsg = "Bonjour SK'Shops 👋 Je souhaite commander :\n";
    cart.forEach(i => { waMsg += `• ${i.qty}x ${i.name} — ${(i.price*i.qty).toLocaleString("fr-FR")} FCFA\n`; });
    waMsg += `\nTotal : ${total.toLocaleString("fr-FR")} FCFA`;
    document.getElementById("cartWhatsapp").href = "https://wa.me/1041288711?text=" + encodeURIComponent(waMsg);

    itemsEl.innerHTML = cart.map(item => `
        <div class="cart-item">
            <span class="cart-item-emoji">${item.emoji}</span>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${(item.price * item.qty).toLocaleString("fr-FR")} FCFA</div>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
                <span class="qty-num">${item.qty}</span>
                <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
            </div>
        </div>
    `).join("");
}

/* ── Panier ouverture/fermeture ─────────────── */
function openCart() {
    document.getElementById("cartSidebar").classList.add("open");
    document.getElementById("cartOverlay").classList.add("active");
    document.body.style.overflow = "hidden";
}
function closeCartSidebar() {
    document.getElementById("cartSidebar").classList.remove("open");
    document.getElementById("cartOverlay").classList.remove("active");
    document.body.style.overflow = "";
}

document.getElementById("cartBtn").addEventListener("click", openCart);
document.getElementById("closeCart").addEventListener("click", closeCartSidebar);
document.getElementById("cartOverlay").addEventListener("click", closeCartSidebar);

// Initialiser l'UI du panier
updateCartUI();

/* ── Quick View ─────────────────────────────── */
const SIZES_CLOTHES = ["XS","S","M","L","XL","XXL"];
const SIZES_SHOES   = ["36","37","38","39","40","41","42","43","44"];

function quickView(id, name, price, emoji, cat) {
    // Chercher dans les produits admin ou les defaults
    if (!name) {
        const card = document.querySelector(`.product-card[data-id="${id}"]`);
        if (!card) return;
        name  = card.querySelector("h3")?.textContent || "";
        price = parseInt(card.dataset.price) || 0;
        emoji = card.querySelector(".card-placeholder")?.textContent || "👗";
        cat   = card.dataset.cat || "";
    }

    const isShoes = cat && cat.toLowerCase().includes("chaussure");
    const sizes   = isShoes ? SIZES_SHOES : SIZES_CLOTHES;

    document.getElementById("quickViewContent").innerHTML = `
        <div class="qv-emoji">${emoji}</div>
        <div class="qv-cat">${cat || "Mode"}</div>
        <div class="qv-name">${name}</div>
        <div class="qv-price">${price.toLocaleString("fr-FR")} FCFA</div>
        <div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin-bottom:8px;">Taille</div>
        <div class="qv-sizes">
            ${sizes.map(s => `<button class="size-btn" onclick="this.parentElement.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active')); this.classList.add('active')">${s}</button>`).join("")}
        </div>
        <div class="qv-actions">
            <button class="btn btn-primary" style="width:100%" onclick="addToCart(${id},'${name.replace(/'/g,"\\'")}',${price},'${emoji}'); closeQuickView();">
                Ajouter au panier
            </button>
            <a class="btn btn-whatsapp" href="https://wa.me/1041288711?text=${encodeURIComponent('Bonjour, je veux commander : '+name)}" target="_blank">
                📲 Commander sur WhatsApp
            </a>
        </div>
    `;
    document.getElementById("quickViewOverlay").classList.add("open");
}

function closeQuickView() { document.getElementById("quickViewOverlay").classList.remove("open"); }
document.getElementById("closeQuickView").addEventListener("click", closeQuickView);
document.getElementById("quickViewOverlay").addEventListener("click", e => { if (e.target === document.getElementById("quickViewOverlay")) closeQuickView(); });

// Attacher quick view aux cartes par défaut
document.querySelectorAll(".product-card[data-id]").forEach(card => {
    const id    = +card.dataset.id;
    const name  = card.querySelector("h3")?.textContent || "";
    const price = +card.dataset.price || 0;
    const emoji = card.querySelector(".card-placeholder")?.textContent || "👗";
    const cat   = card.dataset.cat || "";
    card.querySelector(".quick-view-btn")?.setAttribute("onclick",
        `quickView(${id},'${name.replace(/'/g,"\\'")}',${price},'${emoji}','${cat}')`
    );
});

/* ── Wishlist ─────────────────────────────────── */
let wishlist = JSON.parse(localStorage.getItem("skshops_wishlist") || "[]");

function toggleWishlist(id) {
    const btn = document.querySelector(`.product-card[data-id="${id}"] .wishlist-btn`);
    if (wishlist.includes(id)) {
        wishlist = wishlist.filter(i => i !== id);
        if (btn) { btn.textContent = "♡"; btn.classList.remove("active"); }
        showToast("💔 Retiré des favoris");
    } else {
        wishlist.push(id);
        if (btn) { btn.textContent = "♥"; btn.classList.add("active"); }
        showToast("❤️ Ajouté aux favoris !");
    }
    localStorage.setItem("skshops_wishlist", JSON.stringify(wishlist));
}

/* ── Checkout ────────────────────────────────── */
function proceedCheckout() {
    const user = getCurrentUser();
    if (!user) {
        showToast("⚠️ Connectez-vous pour commander en ligne !");
        setTimeout(() => window.location.href = "auth.html", 1400);
        return;
    }

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const summaryRows = cart.map(i =>
        `<div class="checkout-item"><span>${i.qty}x ${i.name}</span><span>${(i.price*i.qty).toLocaleString("fr-FR")} FCFA</span></div>`
    ).join("");

    document.getElementById("checkoutContent").innerHTML = `
        <div class="checkout-summary">
            ${summaryRows}
            <div class="checkout-total"><span>Total</span><span>${total.toLocaleString("fr-FR")} FCFA</span></div>
        </div>
        <form class="checkout-form" id="checkoutForm" onsubmit="submitOrder(event)">
            <label class="checkout-label">Nom complet</label>
            <input type="text" id="coNom" value="${user.prenom} ${user.nom||''}" required>
            <label class="checkout-label">Téléphone</label>
            <input type="tel" id="coTel" value="${user.tel||''}" placeholder="+229..." required>
            <label class="checkout-label">Adresse de livraison</label>
            <input type="text" id="coAdresse" placeholder="Quartier, ville..." required>
            <label class="checkout-label">Mode de paiement</label>
            <div class="payment-methods">
                <div class="pay-option">
                    <input type="radio" name="paiement" id="payLivraison" value="livraison" checked>
                    <label for="payLivraison">💵 Paiement à la livraison</label>
                </div>
                <div class="pay-option">
                    <input type="radio" name="paiement" id="payMobile" value="mobile">
                    <label for="payMobile">📱 Mobile Money (MTN / Moov)</label>
                </div>
                <div class="pay-option">
                    <input type="radio" name="paiement" id="payWa" value="whatsapp">
                    <label for="payWa">📲 Confirmer via WhatsApp</label>
                </div>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%">✅ Confirmer la commande</button>
        </form>
    `;
    closeCartSidebar();
    document.getElementById("checkoutOverlay").classList.add("open");
}

function submitOrder(e) {
    e.preventDefault();
    const nom     = document.getElementById("coNom").value;
    const tel     = document.getElementById("coTel").value;
    const adresse = document.getElementById("coAdresse").value;
    const paiement = document.querySelector("input[name='paiement']:checked")?.value;

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    let waMsg = `🛍️ Nouvelle commande — SK'Shops\n\n👤 Client : ${nom}\n📞 Tél : ${tel}\n📍 Adresse : ${adresse}\n💳 Paiement : ${paiement}\n\nArticles :\n`;
    cart.forEach(i => { waMsg += `• ${i.qty}x ${i.name} — ${(i.price*i.qty).toLocaleString("fr-FR")} FCFA\n`; });
    waMsg += `\n💰 Total : ${total.toLocaleString("fr-FR")} FCFA`;

    // Sauvegarder la commande
    const orders = JSON.parse(localStorage.getItem("skshops_orders") || "[]");
    orders.push({ id: Date.now(), nom, tel, adresse, paiement, total, items: [...cart], date: new Date().toLocaleDateString("fr-FR"), status: "En attente" });
    localStorage.setItem("skshops_orders", JSON.stringify(orders));

    // Vider le panier
    cart = []; saveCart(); updateCartUI();

    document.getElementById("checkoutOverlay").classList.remove("open");
    showToast("🎉 Commande envoyée ! Merci " + nom.split(" ")[0] + " !");

    if (paiement === "whatsapp" || paiement === "mobile") {
        setTimeout(() => window.open("https://wa.me/1041288711?text=" + encodeURIComponent(waMsg), "_blank"), 800);
    }
}

document.getElementById("closeCheckout").addEventListener("click", () => document.getElementById("checkoutOverlay").classList.remove("open"));
document.getElementById("checkoutOverlay").addEventListener("click", e => { if (e.target === document.getElementById("checkoutOverlay")) document.getElementById("checkoutOverlay").classList.remove("open"); });

/* ── Navbar ─────────────────────────────────── */
window.addEventListener("scroll", () => {
    document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 30);
});

const menuToggle = document.getElementById("menuToggle");
const navLinks   = document.querySelector(".nav-links");
menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    menuToggle.textContent = navLinks.classList.contains("open") ? "✕" : "☰";
});
navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => { navLinks.classList.remove("open"); menuToggle.textContent = "☰"; });
});

/* ── Carousel ─────────────────────────────────── */
(function () {
    const track = document.getElementById("carouselTrack");
    const dotsEl = document.getElementById("carouselDots");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    if (!track) return;

    const items = track.querySelectorAll(".gallery-item");
    const total = items.length;
    let current = 0;

    function getVisible() { return window.innerWidth < 480 ? 1 : window.innerWidth < 768 ? 2 : 3; }
    const maxSteps = total - getVisible() + 1;
    for (let i = 0; i < maxSteps; i++) {
        const dot = document.createElement("div");
        dot.className = "dot" + (i === 0 ? " active" : "");
        dot.addEventListener("click", () => goTo(i));
        dotsEl.appendChild(dot);
    }
    function updateDots() { dotsEl.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("active", i === current)); }
    function goTo(index) {
        const vis = getVisible();
        const max = Math.max(0, total - vis);
        current = Math.max(0, Math.min(index, max));
        const w = items[0].offsetWidth + 16;
        track.style.transform = `translateX(-${current * w}px)`;
        updateDots();
    }
    prevBtn.addEventListener("click", () => goTo(current - 1));
    nextBtn.addEventListener("click", () => goTo(current + 1));
    let auto = setInterval(() => { const max = Math.max(0, total - getVisible()); goTo(current >= max ? 0 : current + 1); }, 4000);
    track.parentElement.addEventListener("mouseenter", () => clearInterval(auto));
    track.parentElement.addEventListener("mouseleave", () => {
        auto = setInterval(() => { const max = Math.max(0, total - getVisible()); goTo(current >= max ? 0 : current + 1); }, 4000);
    });
    let tx = 0;
    track.addEventListener("touchstart", e => tx = e.touches[0].clientX, { passive: true });
    track.addEventListener("touchend", e => { const d = tx - e.changedTouches[0].clientX; if (Math.abs(d) > 40) goTo(d > 0 ? current + 1 : current - 1); });
    window.addEventListener("resize", () => goTo(current));
})();

/* ── Avis ────────────────────────────────────── */
(function () {
    let sel = 0;
    const starSpans = document.querySelectorAll("#starRating span");
    starSpans.forEach(s => {
        s.addEventListener("mouseenter", () => highlight(+s.dataset.val));
        s.addEventListener("mouseleave", () => highlight(sel));
        s.addEventListener("click", () => { sel = +s.dataset.val; highlight(sel); });
    });
    function highlight(val) { starSpans.forEach(s => s.classList.toggle("active", +s.dataset.val <= val)); }

    document.getElementById("reviewForm")?.addEventListener("submit", function (e) {
        e.preventDefault();
        const name = document.getElementById("reviewName").value.trim();
        const text = document.getElementById("reviewText").value.trim();
        const stars = "★".repeat(sel) + "☆".repeat(5 - sel);
        if (!name || !text || sel === 0) { showToast("⚠️ Remplissez tous les champs !"); return; }
        const card = document.createElement("div");
        card.className = "review-card";
        card.style.animation = "fadeUp 0.5s ease both";
        card.innerHTML = `<div class="stars">${stars}</div><p>"${text}"</p><div class="reviewer"><span class="avatar">${name[0].toUpperCase()}</span><strong>${name}</strong></div>`;
        document.getElementById("reviewsGrid").insertBefore(card, document.getElementById("reviewsGrid").firstChild);
        showToast("💛 Merci " + name + " pour votre avis !");
        this.reset(); sel = 0; highlight(0);
    });
})();

/* ── Scroll reveal ─────────────────────────────── */
(function () {
    const targets = document.querySelectorAll(".product-card, .review-card, .contact-card, .avantage");
    targets.forEach(el => el.classList.add("reveal"));
    const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add("visible"), i * 60);
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    targets.forEach(el => obs.observe(el));
})();

/* ── Admin logo (3 clics) ─────────────────────── */
(function () {
    const btn = document.getElementById("adminLogoBtn");
    const hint = document.getElementById("adminClickHint");
    if (!btn) return;
    let clicks = 0, timer = null, hintTimer = null;
    const msgs = ["", "🔐 Encore 2 fois...", "🔐 Encore 1 fois..."];
    btn.addEventListener("click", () => {
        clicks++;
        if (clicks < 3) { hint.textContent = msgs[clicks]; hint.style.opacity = "1"; clearTimeout(hintTimer); hintTimer = setTimeout(() => hint.style.opacity = "0", 1500); }
        if (clicks >= 3) { hint.textContent = "✅ Admin..."; hint.style.opacity = "1"; clicks = 0; clearTimeout(timer); setTimeout(() => window.location.href = "admin.html", 900); return; }
        clearTimeout(timer);
        timer = setTimeout(() => { clicks = 0; hint.style.opacity = "0"; }, 3000);
    });
})();

/* ── Footer orders link ─────────────────────────── */
document.getElementById("footerOrders")?.addEventListener("click", (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) { showToast("⚠️ Connectez-vous d'abord !"); setTimeout(() => window.location.href = "auth.html", 1200); }
    else { showToast("📦 Vos commandes arrivent bientôt !"); }
});

/* ── Toast ─────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}