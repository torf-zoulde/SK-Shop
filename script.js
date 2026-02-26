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
    if (label && user) label.textContent = user.prenom || "Mon compte";
}
updateAccountNav();

/* ── Chargement produits admin ─────────────── */
(function loadAdminProducts() {
    const raw = localStorage.getItem("skshops_products");
    if (!raw) return;
    let adminProducts;
    try { adminProducts = JSON.parse(raw); } catch { return; }
    if (!Array.isArray(adminProducts) || adminProducts.length === 0) return;

    const grids = {
        nouveautes: document.getElementById("nouveautesGrid"),
        vetements:  document.getElementById("vetementsGrid"),
        chaussures: document.getElementById("chaussuresGrid")
    };

    const available = adminProducts.filter(p => p.available !== false);
    if (available.length > 0) Object.values(grids).forEach(g => { if (g) g.innerHTML = ""; });

    available.forEach(p => {
        const card = createProductCard(p);
        if (p.cat === "vetements" && grids.vetements)        grids.vetements.appendChild(card);
        else if (p.cat === "chaussures" && grids.chaussures) grids.chaussures.appendChild(card);
        else if (grids.nouveautes)                           grids.nouveautes.appendChild(card);
    });
})();

function createProductCard(p) {
    const hasImg = p.img && p.img.length > 0;
    const div = document.createElement("div");
    div.className = "product-card";
    div.dataset.id = p.id;
    div.innerHTML = `
        <div class="card-img">
            ${hasImg ? `<img src="${p.img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;z-index:1;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : ''}
            <div class="card-placeholder" style="${hasImg ? 'display:none;' : ''}">${p.emoji || "👗"}</div>
            ${p.badge ? `<div class="card-badge ${p.badge==='Bestseller'?'bestseller':p.badge==='Promo'?'promo':''}" style="z-index:2;position:relative;">${p.badge}</div>` : ''}
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
        </div>`;
    return div;
}

/* ── Masquer emojis sur cartes statiques avec image ── */
(function () {
    document.querySelectorAll(".product-card .card-img").forEach(ci => {
        const img = ci.querySelector("img");
        const ph  = ci.querySelector(".card-placeholder");
        if (!img || !ph) return;
        if (img.complete && img.naturalWidth > 0) ph.style.display = "none";
        else {
            img.addEventListener("load",  () => ph.style.display = "none");
            img.addEventListener("error", () => { img.style.display = "none"; ph.style.display = "flex"; });
        }
    });
})();

/* ══════════════════════════════════════════════
   PANIER
══════════════════════════════════════════════ */
let cart = JSON.parse(localStorage.getItem("skshops_cart") || "[]");

function saveCart() { localStorage.setItem("skshops_cart", JSON.stringify(cart)); }

function addToCart(id, name, price, emoji) {
    emoji = emoji || "👗";
    const existing = cart.find(i => i.id === id);
    if (existing) existing.qty++;
    else cart.push({ id, name, price, emoji, qty: 1 });
    saveCart(); updateCartUI(); openCart();
    showToast("✅ " + name + " ajouté au panier !");
}

function removeFromCart(id) { cart = cart.filter(i => i.id !== id); saveCart(); updateCartUI(); }

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) removeFromCart(id);
    else { saveCart(); updateCartUI(); }
}

function updateCartUI() {
    const count  = cart.reduce((s, i) => s + i.qty, 0);
    const total  = cart.reduce((s, i) => s + i.price * i.qty, 0);
    document.getElementById("cartCount").textContent = count;

    const itemsEl  = document.getElementById("cartItems");
    const footerEl = document.getElementById("cartFooter");
    const totalEl  = document.getElementById("cartTotal");

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
        </div>`).join("");
}

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
updateCartUI();

/* ══════════════════════════════════════════════
   QUICK VIEW
══════════════════════════════════════════════ */
const SIZES_CLOTHES = ["XS","S","M","L","XL","XXL"];
const SIZES_SHOES   = ["36","37","38","39","40","41","42","43","44"];

function quickView(id, name, price, emoji, cat) {
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
        <div style="font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#888;margin-bottom:8px;">Taille</div>
        <div class="qv-sizes">
            ${sizes.map(s => `<button class="size-btn" onclick="this.parentElement.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active')">${s}</button>`).join("")}
        </div>
        <div class="qv-actions">
            <button class="btn btn-primary" style="width:100%" onclick="addToCart(${id},'${name.replace(/'/g,"\\'")}',${price},'${emoji}');closeQuickView();">Ajouter au panier</button>
            <a class="btn btn-whatsapp" href="https://wa.me/1041288711?text=${encodeURIComponent('Bonjour, je veux commander : '+name)}" target="_blank">📲 Commander via WhatsApp</a>
        </div>`;
    document.getElementById("quickViewOverlay").classList.add("open");
}

function closeQuickView() { document.getElementById("quickViewOverlay").classList.remove("open"); }
document.getElementById("closeQuickView").addEventListener("click", closeQuickView);
document.getElementById("quickViewOverlay").addEventListener("click", e => {
    if (e.target === document.getElementById("quickViewOverlay")) closeQuickView();
});

document.querySelectorAll(".product-card[data-id]").forEach(card => {
    const id    = +card.dataset.id;
    const name  = card.querySelector("h3")?.textContent || "";
    const price = +card.dataset.price || 0;
    const emoji = card.querySelector(".card-placeholder")?.textContent || "👗";
    const cat   = card.dataset.cat || "";
    card.querySelector(".quick-view-btn")?.setAttribute("onclick",
        `quickView(${id},'${name.replace(/'/g,"\\'")}',${price},'${emoji}','${cat}')`);
});

/* ── Wishlist ── */
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

/* ══════════════════════════════════════════════
   CHECKOUT — DONNÉES PARTAGÉES ENTRE ÉTAPES
══════════════════════════════════════════════ */
let checkoutData = {};
let selectedOperator = null;

/* ── OPÉRATEURS MOBILE MONEY ── */
const OPERATORS = [
    {
        id: "mtn",
        name: "MTN Mobile Money",
        shortName: "MTN MoMo",
        bg: "linear-gradient(135deg,#FFCC00,#FF8C00)",
        color: "#FFCC00",
        textColor: "#1a0800",
        logo: "MTN",
        ussd: "*880#",
        desc: "Paiement rapide via MTN MoMo"
    },
    {
        id: "moov",
        name: "Moov Money",
        shortName: "Moov",
        bg: "linear-gradient(135deg,#00AEEF,#0055CC)",
        color: "#00AEEF",
        textColor: "#ffffff",
        logo: "MOOV",
        ussd: "*555#",
        desc: "Paiement Moov Money Bénin"
    },
    {
        id: "celtiis",
        name: "Celtiis Cash",
        shortName: "Celtiis",
        bg: "linear-gradient(135deg,#E30613,#7B0000)",
        color: "#E30613",
        textColor: "#ffffff",
        logo: "CELT",
        ussd: "*100#",
        desc: "Paiement Celtiis Cash"
    }
];

/* ══════════════════════════════════════════════
   ÉTAPE 1 — INFOS CLIENT + CHOIX PAIEMENT
══════════════════════════════════════════════ */
function proceedCheckout() {
    const user = getCurrentUser();
    if (!user) {
        showToast("⚠️ Connectez-vous pour commander en ligne !");
        setTimeout(() => window.location.href = "auth.html", 1400);
        return;
    }

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    checkoutData.total = total;

    const summaryRows = cart.map(i =>
        `<div class="checkout-item"><span>${i.qty}× ${i.name}</span><span>${(i.price*i.qty).toLocaleString("fr-FR")} FCFA</span></div>`
    ).join("");

    document.getElementById("checkoutContent").innerHTML = `
        <div class="checkout-summary">
            ${summaryRows}
            <div class="checkout-total">
                <span>Total commande</span>
                <span>${total.toLocaleString("fr-FR")} FCFA</span>
            </div>
        </div>

        <form id="checkoutForm" onsubmit="handleStep1(event)">
            <label class="checkout-label">Nom complet</label>
            <input type="text" id="coNom" value="${(user.prenom||'')+' '+(user.nom||'')}" placeholder="Votre nom..." required>

            <label class="checkout-label">Téléphone</label>
            <input type="tel" id="coTel" value="${user.tel||''}" placeholder="+229..." required>

            <label class="checkout-label">Adresse de livraison</label>
            <input type="text" id="coAdresse" placeholder="Quartier, rue, ville..." required>

            <label class="checkout-label">Mode de paiement</label>
            <div class="payment-methods">
                <label class="pay-option selected" onclick="selectPay(this)">
                    <input type="radio" name="paiement" value="livraison" checked>
                    <div class="pay-icon-wrap" style="background:linear-gradient(135deg,#2ecc8a,#1a9966)">💵</div>
                    <div class="pay-details">
                        <strong>Paiement à la livraison</strong>
                        <span>Payez en espèces à la réception</span>
                    </div>
                    <span class="pay-tick">✓</span>
                </label>
                <label class="pay-option" onclick="selectPay(this)">
                    <input type="radio" name="paiement" value="mobile">
                    <div class="pay-icon-wrap" style="background:linear-gradient(135deg,#FFCC00,#FF8C00)">📱</div>
                    <div class="pay-details">
                        <strong>Mobile Money</strong>
                        <span>MTN · Moov · Celtiis</span>
                    </div>
                    <span class="pay-tick">✓</span>
                </label>
                <label class="pay-option" onclick="selectPay(this)">
                    <input type="radio" name="paiement" value="whatsapp">
                    <div class="pay-icon-wrap" style="background:linear-gradient(135deg,#25D366,#128C7E)">📲</div>
                    <div class="pay-details">
                        <strong>Via WhatsApp</strong>
                        <span>Un agent vous contactera</span>
                    </div>
                    <span class="pay-tick">✓</span>
                </label>
            </div>

            <button type="submit" class="btn btn-primary" style="width:100%;padding:14px;font-size:15px;margin-top:6px">
                Continuer →
            </button>
        </form>`;

    closeCartSidebar();
    document.getElementById("checkoutOverlay").classList.add("open");
}

function selectPay(el) {
    document.querySelectorAll(".pay-option").forEach(o => o.classList.remove("selected"));
    el.classList.add("selected");
    el.querySelector("input").checked = true;
}

function handleStep1(e) {
    e.preventDefault();
    checkoutData.nom     = document.getElementById("coNom").value.trim();
    checkoutData.tel     = document.getElementById("coTel").value.trim();
    checkoutData.adresse = document.getElementById("coAdresse").value.trim();
    checkoutData.method  = document.querySelector("input[name='paiement']:checked")?.value;

    if (checkoutData.method === "mobile") showOperatorStep();
    else if (checkoutData.method === "whatsapp") finalizeOrder("whatsapp");
    else finalizeOrder("livraison");
}

/* ══════════════════════════════════════════════
   ÉTAPE 2 — CHOIX OPÉRATEUR MOBILE
══════════════════════════════════════════════ */
function showOperatorStep() {
    document.getElementById("checkoutContent").innerHTML = `
        <button class="co-back-btn" onclick="proceedCheckout()">← Retour</button>

        <div class="co-step-header">
            <div class="co-steps-track">
                <div class="co-step-dot done">✓</div>
                <div class="co-step-line done"></div>
                <div class="co-step-dot active">2</div>
                <div class="co-step-line"></div>
                <div class="co-step-dot">3</div>
            </div>
            <h4>Choisissez votre réseau</h4>
            <p>Sélectionnez votre opérateur Mobile Money</p>
        </div>

        <div class="operators-list">
            ${OPERATORS.map(op => `
                <button class="op-card" id="op-${op.id}" onclick="pickOperator('${op.id}')">
                    <div class="op-logo-badge" style="background:${op.bg};color:${op.textColor}">${op.logo}</div>
                    <div class="op-text">
                        <strong>${op.name}</strong>
                        <span>${op.desc} · ${op.ussd}</span>
                    </div>
                    <div class="op-radio-circle"></div>
                </button>
            `).join("")}
        </div>

        <div class="co-amount-pill">
            Montant : <strong>${checkoutData.total.toLocaleString("fr-FR")} FCFA</strong>
        </div>

        <button class="btn btn-primary" id="opNextBtn" style="width:100%;padding:14px;font-size:15px;margin-top:16px;opacity:.45;cursor:not-allowed" disabled onclick="goToNumberStep()">
            Continuer →
        </button>`;
}

function pickOperator(id) {
    selectedOperator = OPERATORS.find(o => o.id === id);
    document.querySelectorAll(".op-card").forEach(c => c.classList.remove("active"));
    document.getElementById("op-" + id)?.classList.add("active");
    const btn = document.getElementById("opNextBtn");
    btn.removeAttribute("disabled");
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
}

function goToNumberStep() {
    if (!selectedOperator) return;
    showNumberStep();
}

/* ══════════════════════════════════════════════
   ÉTAPE 3 — SAISIE NUMÉRO + CONFIRMATION
══════════════════════════════════════════════ */
function showNumberStep() {
    const op = selectedOperator;
    document.getElementById("checkoutContent").innerHTML = `
        <button class="co-back-btn" onclick="showOperatorStep()">← Retour</button>

        <div class="co-step-header">
            <div class="co-steps-track">
                <div class="co-step-dot done">✓</div>
                <div class="co-step-line done"></div>
                <div class="co-step-dot done">✓</div>
                <div class="co-step-line done"></div>
                <div class="co-step-dot active">3</div>
            </div>
            <h4>Finaliser le paiement</h4>
            <p>Entrez votre numéro ${op.shortName}</p>
        </div>

        <div class="mobile-pay-card">
            <div class="mpc-top" style="background:${op.bg}">
                <div class="mpc-logo-big" style="color:${op.textColor}">${op.logo}</div>
                <div class="mpc-top-info" style="color:${op.textColor}">
                    <span class="mpc-op-name">${op.name}</span>
                    <span class="mpc-op-ussd">Composer ${op.ussd} pour vérifier votre solde</span>
                </div>
            </div>

            <div class="mpc-body">
                <div class="mpc-amount-row">
                    <span>💰 Montant à débiter</span>
                    <strong>${checkoutData.total.toLocaleString("fr-FR")} FCFA</strong>
                </div>

                <div class="mpc-number-section">
                    <label class="checkout-label">Numéro ${op.name}</label>
                    <div class="phone-input-wrap">
                        <span class="phone-flag">🇧🇯</span>
                        <span class="phone-code">+229</span>
                        <input type="tel" id="mobilePayNum"
                            placeholder="96 XX XX XX"
                            maxlength="11"
                            oninput="fmtPhone(this)"
                            autocomplete="tel">
                    </div>
                    <p class="phone-hint">Numéro lié à votre compte ${op.shortName}</p>
                </div>

                <div class="mpc-how-it-works">
                    <div class="mpc-step-row"><span class="mpc-num" style="background:${op.bg};color:${op.textColor}">1</span><span>Vous recevez une notification de paiement</span></div>
                    <div class="mpc-step-row"><span class="mpc-num" style="background:${op.bg};color:${op.textColor}">2</span><span>Confirmez avec votre code secret ${op.shortName}</span></div>
                    <div class="mpc-step-row"><span class="mpc-num" style="background:${op.bg};color:${op.textColor}">3</span><span>Paiement validé, commande confirmée !</span></div>
                </div>
            </div>
        </div>

        <button class="btn-pay-confirm" style="background:${op.bg};color:${op.textColor}" onclick="submitMobilePayment()">
            <span>🔒</span>
            Payer ${checkoutData.total.toLocaleString("fr-FR")} FCFA
        </button>
        <p class="secure-note">🛡️ Paiement sécurisé · Vos données sont protégées</p>`;
}

function fmtPhone(input) {
    let v = input.value.replace(/\D/g, "").slice(0, 8);
    let out = "";
    if (v.length > 0) out = v.slice(0, 2);
    if (v.length > 2) out += " " + v.slice(2, 4);
    if (v.length > 4) out += " " + v.slice(4, 6);
    if (v.length > 6) out += " " + v.slice(6, 8);
    input.value = out;
}

function submitMobilePayment() {
    const input = document.getElementById("mobilePayNum");
    const raw   = (input?.value || "").replace(/\s/g, "");

    if (!input || raw.length < 8) {
        if (input) {
            input.style.borderColor = "#e04455";
            input.style.boxShadow   = "0 0 0 3px rgba(224,68,85,.15)";
            input.focus();
        }
        showToast("⚠️ Entrez un numéro valide (8 chiffres) !");
        return;
    }

    const op = selectedOperator;
    checkoutData.paiement = `${op.name} (+229 ${input.value})`;

    /* Écran de traitement */
    document.getElementById("checkoutContent").innerHTML = `
        <div class="co-processing">
            <div class="co-processing-ring" style="--op-c:${op.color}"></div>
            <div class="co-processing-logo" style="background:${op.bg};color:${op.textColor}">${op.logo}</div>
            <h4>Traitement en cours…</h4>
            <p>Connexion à ${op.name}</p>
            <p class="co-processing-num">+229 ${input.value}</p>
        </div>`;

    setTimeout(() => showPaySuccess(), 2400);
}

/* ── SUCCÈS ── */
function showPaySuccess() {
    const op = selectedOperator;

    const orders = JSON.parse(localStorage.getItem("skshops_orders") || "[]");
    orders.push({
        id: Date.now(),
        nom: checkoutData.nom,
        tel: checkoutData.tel,
        adresse: checkoutData.adresse,
        paiement: checkoutData.paiement,
        total: checkoutData.total,
        items: [...cart],
        date: new Date().toLocaleDateString("fr-FR"),
        status: "Confirmé"
    });
    localStorage.setItem("skshops_orders", JSON.stringify(orders));

    const nomClient = checkoutData.nom;
    cart = []; saveCart(); updateCartUI();

    document.getElementById("checkoutContent").innerHTML = `
        <div class="co-success">
            <div class="co-success-ring"></div>
            <div class="co-success-icon" style="background:${op.bg};color:${op.textColor}">✓</div>
            <h3>Paiement confirmé !</h3>
            <p>Merci <strong>${nomClient.split(" ")[0]}</strong>, votre commande a bien été reçue.</p>
            <div class="co-success-ref">Réf #SK${Date.now().toString().slice(-6)}</div>
            <p class="co-success-sms">📩 Un SMS de confirmation sera envoyé au numéro renseigné.</p>
            <button class="btn btn-primary" style="width:100%;margin-top:22px;padding:14px" onclick="document.getElementById('checkoutOverlay').classList.remove('open')">
                Fermer ✕
            </button>
        </div>`;
}

/* ── Commande livraison / WhatsApp ── */
function finalizeOrder(type) {
    const orders = JSON.parse(localStorage.getItem("skshops_orders") || "[]");
    orders.push({
        id: Date.now(),
        nom: checkoutData.nom,
        tel: checkoutData.tel,
        adresse: checkoutData.adresse,
        paiement: type === "livraison" ? "Paiement à la livraison" : "Via WhatsApp",
        total: checkoutData.total,
        items: [...cart],
        date: new Date().toLocaleDateString("fr-FR"),
        status: "En attente"
    });
    localStorage.setItem("skshops_orders", JSON.stringify(orders));

    let waMsg = `🛍️ Nouvelle commande — SK'Shops\n\n👤 ${checkoutData.nom}\n📞 ${checkoutData.tel}\n📍 ${checkoutData.adresse}\n💳 ${type === "whatsapp" ? "Via WhatsApp" : "À la livraison"}\n\nArticles :\n`;
    cart.forEach(i => { waMsg += `• ${i.qty}x ${i.name} — ${(i.price*i.qty).toLocaleString("fr-FR")} FCFA\n`; });
    waMsg += `\n💰 Total : ${checkoutData.total.toLocaleString("fr-FR")} FCFA`;

    const nom = checkoutData.nom;
    cart = []; saveCart(); updateCartUI();
    document.getElementById("checkoutOverlay").classList.remove("open");
    showToast("🎉 Commande confirmée ! Merci " + nom.split(" ")[0] + " !");

    if (type === "whatsapp") {
        setTimeout(() => window.open("https://wa.me/1041288711?text=" + encodeURIComponent(waMsg), "_blank"), 600);
    }
}

document.getElementById("closeCheckout").addEventListener("click", () => document.getElementById("checkoutOverlay").classList.remove("open"));
document.getElementById("checkoutOverlay").addEventListener("click", e => {
    if (e.target === document.getElementById("checkoutOverlay")) document.getElementById("checkoutOverlay").classList.remove("open");
});

/* ── Navbar ── */
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

/* ── Carousel ── */
(function () {
    const track  = document.getElementById("carouselTrack");
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
        const vis = getVisible(), max = Math.max(0, total - vis);
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

/* ── Avis ── */
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
        const name  = document.getElementById("reviewName").value.trim();
        const text  = document.getElementById("reviewText").value.trim();
        const stars = "★".repeat(sel) + "☆".repeat(5 - sel);
        if (!name || !text || sel === 0) { showToast("⚠️ Remplissez tous les champs !"); return; }
        const card = document.createElement("div");
        card.className = "review-card";
        card.style.animation = "fadeUp 0.5s ease both";
        card.innerHTML = `<div class="stars">${stars}</div><p>"${text}"</p><div class="reviewer"><span class="avatar">${name[0].toUpperCase()}</span><strong>${name}</strong></div>`;
        document.getElementById("reviewsGrid").insertBefore(card, document.getElementById("reviewsGrid").firstChild);
        const reviews = JSON.parse(localStorage.getItem("skshops_reviews") || "[]");
        reviews.push({ name, comment: text, rating: sel, date: new Date().toLocaleDateString("fr-FR") });
        localStorage.setItem("skshops_reviews", JSON.stringify(reviews));
        showToast("💛 Merci " + name + " pour votre avis !");
        this.reset(); sel = 0; highlight(0);
    });
})();

/* ── Scroll reveal ── */
(function () {
    const targets = document.querySelectorAll(".product-card,.review-card,.contact-card,.avantage");
    targets.forEach(el => el.classList.add("reveal"));
    const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) { setTimeout(() => entry.target.classList.add("visible"), i * 60); obs.unobserve(entry.target); }
        });
    }, { threshold: 0.1 });
    targets.forEach(el => obs.observe(el));
})();

/* ── Admin 3 clics ── */
(function () {
    const btn = document.getElementById("adminLogoBtn");
    const hint = document.getElementById("adminClickHint");
    if (!btn) return;
    let clicks = 0, timer = null, hintTimer = null;
    const msgs = ["", "🔐 Encore 2 fois...", "🔐 Encore 1 fois..."];
    btn.addEventListener("click", () => {
        clicks++;
        if (clicks < 3) { hint.textContent = msgs[clicks]; hint.style.opacity = "1"; clearTimeout(hintTimer); hintTimer = setTimeout(() => hint.style.opacity = "0", 1500); }
        if (clicks >= 3) { hint.textContent = "✅ Admin..."; hint.style.opacity = "1"; clicks = 0; setTimeout(() => window.location.href = "admin.html", 900); return; }
        clearTimeout(timer);
        timer = setTimeout(() => { clicks = 0; hint.style.opacity = "0"; }, 3000);
    });
})();

document.getElementById("footerOrders")?.addEventListener("click", (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) { showToast("⚠️ Connectez-vous d'abord !"); setTimeout(() => window.location.href = "auth.html", 1200); }
    else { showToast("📦 Vos commandes arrivent bientôt !"); }
});

/* ── Toast ── */
let toastTimer;
function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}