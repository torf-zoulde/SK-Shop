/* =============================================
   SK'SHOPS — admin.js  (version améliorée)
   ============================================= */

/* ── Mobile menu ── */
const sidebar = document.getElementById("sidebar");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const sidebarClose = document.getElementById("sidebarClose");

function openSidebar() { sidebar.classList.add("open"); sidebarBackdrop.classList.add("active"); }
function closeSidebar() { sidebar.classList.remove("open"); sidebarBackdrop.classList.remove("active"); }

mobileMenuBtn.addEventListener("click", openSidebar);
sidebarClose.addEventListener("click", closeSidebar);
sidebarBackdrop.addEventListener("click", closeSidebar);

/* ── Constants ── */
const DEFAULT_PASSWORD = "skshops2026";
const PW_KEY     = "skshops_admin_pw";
const PROD_KEY   = "skshops_products";
const USERS_KEY  = "skshops_users";
const ORDERS_KEY = "skshops_orders";
const SETTINGS_KEY = "skshops_settings";
const REVIEWS_KEY  = "skshops_reviews";

const DEFAULT_PRODUCTS = [
    { id: 1, name: "Robe Élégance Noire", price: 18000, desc: "Robe longue noire, idéale pour soirée.", badge: "Nouveau", emoji: "👗", img: "", gallery: [], available: true, cat: "vetements" },
    { id: 2, name: "Sneaker Urban Blanc", price: 22000, desc: "Sneakers blanches tendance et confortables.", badge: "Bestseller", emoji: "👟", img: "", gallery: [], available: true, cat: "chaussures" },
    { id: 3, name: "Chemise Lin Homme", price: 12000, desc: "Chemise légère en lin, coupe droite.", badge: "Promo", emoji: "👔", img: "", gallery: [], available: true, cat: "vetements" },
    { id: 4, name: "Escarpin Talon Rouge", price: 25000, desc: "Escarpins en cuir verni rouge, talon 8cm.", badge: "Populaire", emoji: "👠", img: "", gallery: [], available: true, cat: "chaussures" }
];

/* ── State ── */
let products = [];
let editingId = null;
let selectedEmoji = "";
let currentImageBase64 = "";
let galleryImages = [];
let salesChartInstance = null;
let catChartInstance = null;

/* ── Helpers ── */
function getPassword() { return localStorage.getItem(PW_KEY) || DEFAULT_PASSWORD; }
function savePassword(pw) { localStorage.setItem(PW_KEY, pw); }

function loadProducts() {
    const raw = localStorage.getItem(PROD_KEY);
    if (raw) { try { products = JSON.parse(raw); } catch { products = [...DEFAULT_PRODUCTS]; } }
    else { products = [...DEFAULT_PRODUCTS]; saveProducts(); }
    // Migrate old products without gallery
    products = products.map(p => ({ gallery: [], ...p }));
}
function saveProducts() { localStorage.setItem(PROD_KEY, JSON.stringify(products)); }
function nextId() { return products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1; }

/* ── Toast ── */
let toastTimer;
function showToast(msg, type = "") {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.className = "toast show" + (type ? " toast-" + type : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

/* ── LOGIN ── */
document.getElementById("togglePw").addEventListener("click", () => {
    const inp = document.getElementById("pwInput");
    inp.type = inp.type === "password" ? "text" : "password";
});

document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const val = document.getElementById("pwInput").value;
    if (val === getPassword()) {
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("dashboard").style.display = "flex";
        document.getElementById("loginError").textContent = "";
        loadProducts();
        renderProducts();
        updateStats();
        loadOrders();
        loadClients();
        loadSettings();
    } else {
        document.getElementById("loginError").textContent = "❌ Mot de passe incorrect";
        document.getElementById("pwInput").value = "";
    }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("pwInput").value = "";
});

/* ── TABS ── */
const navItems = document.querySelectorAll(".nav-item");
const tabPanels = document.querySelectorAll(".tab-content");
const pageTitle = document.getElementById("pageTitle");
const pageSub = document.getElementById("pageSubtitle");
const openModalBtn = document.getElementById("openModalBtn");

const tabMeta = {
    products:  { title: "Gestion des Articles", sub: "Ajoutez, modifiez ou supprimez vos articles", showAdd: true },
    orders:    { title: "Commandes", sub: "Toutes les commandes clients", showAdd: false },
    clients:   { title: "Clients", sub: "Liste des clients inscrits", showAdd: false },
    analytics: { title: "Analytiques & IA", sub: "Statistiques de vente et insights intelligents", showAdd: false },
    settings:  { title: "Paramètres", sub: "Configurez votre boutique", showAdd: false }
};

navItems.forEach(item => {
    item.addEventListener("click", (e) => {
        e.preventDefault();
        const tab = item.dataset.tab;
        navItems.forEach(n => n.classList.remove("active"));
        tabPanels.forEach(p => p.classList.remove("active"));
        item.classList.add("active");
        document.getElementById("tab-" + tab)?.classList.add("active");
        const meta = tabMeta[tab];
        if (meta) {
            pageTitle.textContent = meta.title;
            pageSub.textContent = meta.sub;
            openModalBtn.style.display = meta.showAdd ? "inline-flex" : "none";
        }
        if (tab === "analytics") { setTimeout(renderAnalytics, 50); }
        closeSidebar();
    });
});

/* ── RENDER PRODUCTS ── */
function renderProducts(filter = "") {
    const grid = document.getElementById("productsGrid");
    const empty = document.getElementById("emptyState");
    const countEl = document.getElementById("productCount");

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        (p.desc || "").toLowerCase().includes(filter.toLowerCase())
    );

    countEl.textContent = products.length + " article(s)";

    if (filtered.length === 0) {
        grid.innerHTML = "";
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";

    grid.innerHTML = filtered.map(p => {
        const hasImg = p.img && p.img.length > 0;
        return `
        <div class="admin-product-card ${!p.available ? 'unavailable' : ''}">
            <div class="admin-card-img">
                ${hasImg ? `<img src="${p.img}" alt="${p.name}" onerror="this.remove()">` : ''}
                ${(!hasImg && p.emoji) ? `<span class="card-emoji-icon">${p.emoji}</span>` : ''}
                ${!hasImg && !p.emoji ? `<span class="card-emoji-icon">🛍️</span>` : ''}
                ${p.badge ? `<span class="card-badge ${p.badge==='Nouveau'?'new-badge':''}">${p.badge}</span>` : ''}
                ${!p.available ? '<span class="unavail-tag">Indisponible</span>' : ''}
                ${(p.gallery && p.gallery.length > 0) ? `<span class="gallery-count-tag">📸 ${p.gallery.length}</span>` : ''}
            </div>
            <div class="admin-card-body">
                <h4>${p.name}</h4>
                <p>${p.desc}</p>
                <div class="card-price">${p.price.toLocaleString("fr-FR")} FCFA</div>
            </div>
            <div class="card-actions">
                <button class="btn-edit" onclick="openEdit(${p.id})">✏️ Modifier</button>
                <button class="btn-delete" onclick="deleteProduct(${p.id})">🗑️ Supprimer</button>
            </div>
        </div>
    `}).join("");
}

function updateStats() {
    document.getElementById("statTotal").textContent = products.length;
    document.getElementById("statNew").textContent = products.filter(p => p.badge === "Nouveau").length;
    const avg = products.length > 0 ? Math.round(products.reduce((s,p) => s+p.price, 0) / products.length) : 0;
    document.getElementById("statAvgPrice").textContent = avg.toLocaleString("fr-FR");
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    document.getElementById("statOrders").textContent = orders.length;
}

document.getElementById("searchInput").addEventListener("input", function () { renderProducts(this.value); });

/* ── ORDERS ── */
function loadOrders() {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    const section = document.getElementById("adminOrdersList");

    if (orders.length === 0) {
        section.innerHTML = `<div class="coming-soon"><span>📦</span><h3>Aucune commande</h3><p>Les commandes passées sur le site apparaîtront ici.</p></div>`;
        return;
    }

    section.innerHTML = `
        <div class="orders-list-inner">
            ${orders.slice().reverse().map(o => `
                <div class="order-card-row" onclick="showOrderDetail(${o.id})">
                    <div class="order-card-left">
                        <div class="order-avatar">${(o.nom || 'C')[0].toUpperCase()}</div>
                        <div class="order-info">
                            <div class="order-client-name">${o.prenom ? o.prenom + ' ' : ''}${o.nom || 'Client'}</div>
                            <div class="order-meta">📞 ${o.tel || '-'} &nbsp;•&nbsp; ${o.date || '-'}</div>
                            <div class="order-items-preview">${(o.items || []).slice(0,2).map(i => i.name).join(', ') || 'Commande'}</div>
                        </div>
                    </div>
                    <div class="order-card-right">
                        <div class="order-total">${(o.total || 0).toLocaleString("fr-FR")} FCFA</div>
                        <div class="order-payment">${o.paiement || '-'}</div>
                        <span class="order-status-badge ${getStatusClass(o.status)}" onclick="event.stopPropagation();cycleStatus(${o.id})">${o.status || 'En attente'}</span>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function getStatusClass(status) {
    if (status === 'Livré') return 'status-done';
    if (status === 'Confirmé') return 'status-confirmed';
    if (status === 'Annulé') return 'status-cancelled';
    return 'status-pending';
}

const STATUS_CYCLE = ['En attente', 'Confirmé', 'Livré', 'Annulé'];

function cycleStatus(id) {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return;
    const cur = STATUS_CYCLE.indexOf(orders[idx].status || 'En attente');
    orders[idx].status = STATUS_CYCLE[(cur + 1) % STATUS_CYCLE.length];
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    loadOrders();
    updateStats();
    showToast(`Statut → ${orders[idx].status}`);
}

function showOrderDetail(id) {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    const o = orders.find(x => x.id === id);
    if (!o) return;
    const body = document.getElementById("orderModalBody");
    body.innerHTML = `
        <div class="order-detail">
            <div class="order-detail-header">
                <div class="order-avatar large">${(o.nom || 'C')[0].toUpperCase()}</div>
                <div>
                    <h2 class="order-detail-name">${o.prenom ? o.prenom + ' ' : ''}${o.nom || 'Client'}</h2>
                    <p class="order-detail-sub">#${String(o.id).slice(-6)} &nbsp;•&nbsp; ${o.date || '-'}</p>
                </div>
                <span class="order-status-badge ${getStatusClass(o.status)}" style="cursor:pointer" onclick="cycleStatusDetail(${o.id})">${o.status || 'En attente'} ↻</span>
            </div>
            <div class="order-detail-grid">
                <div class="order-detail-section">
                    <h4>📞 Contact</h4>
                    <p>${o.tel || '-'}</p>
                    <p>${o.email || '-'}</p>
                </div>
                <div class="order-detail-section">
                    <h4>💳 Paiement</h4>
                    <p>${o.paiement || '-'}</p>
                </div>
                <div class="order-detail-section">
                    <h4>📍 Adresse</h4>
                    <p>${o.adresse || 'Non renseignée'}</p>
                </div>
            </div>
            <div class="order-detail-items">
                <h4>🛍️ Articles commandés</h4>
                ${(o.items || []).map(item => `
                    <div class="order-item-row">
                        <span class="order-item-emoji">${item.emoji || '👗'}</span>
                        <span class="order-item-name">${item.name}</span>
                        <span class="order-item-qty">×${item.qty || 1}</span>
                        <span class="order-item-price">${(item.price || 0).toLocaleString("fr-FR")} FCFA</span>
                    </div>
                `).join("") || '<p style="color:#888;font-size:13px">Aucun détail disponible</p>'}
            </div>
            <div class="order-detail-total">
                <span>Total</span>
                <span class="order-total-amount">${(o.total || 0).toLocaleString("fr-FR")} FCFA</span>
            </div>
            <div class="order-detail-actions">
                <button class="btn btn-primary" onclick="cycleStatusDetail(${o.id})">Changer le statut ↻</button>
                <a href="https://wa.me/${(localStorage.getItem('skshops_settings') && JSON.parse(localStorage.getItem('skshops_settings')).wa) || ''}?text=Bonjour%20${encodeURIComponent(o.prenom || o.nom || 'Client')}%2C%20votre%20commande%20est%20${encodeURIComponent(o.status || 'en cours')}." target="_blank" class="btn btn-ghost">📲 WhatsApp</a>
            </div>
        </div>
    `;
    document.getElementById("orderModalOverlay").classList.add("open");
}

function cycleStatusDetail(id) {
    cycleStatus(id);
    showOrderDetail(id);
}

document.getElementById("closeOrderModal").addEventListener("click", () => {
    document.getElementById("orderModalOverlay").classList.remove("open");
});
document.getElementById("orderModalOverlay").addEventListener("click", e => {
    if (e.target === document.getElementById("orderModalOverlay")) document.getElementById("orderModalOverlay").classList.remove("open");
});

/* ── CLIENTS ── */
function loadClients() {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    const section = document.getElementById("clientsTable");
    if (users.length === 0) {
        section.innerHTML = `<div class="coming-soon"><span>👥</span><h3>Aucun client inscrit</h3><p>Les clients créant un compte apparaîtront ici.</p></div>`;
        return;
    }
    section.innerHTML = `
        <div class="clients-table-inner">
            <table>
                <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Inscrit le</th></tr></thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td><strong>${u.prenom} ${u.nom}</strong></td>
                            <td>${u.email}</td>
                            <td>${u.tel || '-'}</td>
                            <td>${u.createdAt || '-'}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

/* ── IMAGE UPLOAD ── */
const imgUploadZone = document.getElementById("imgUploadZone");
const imgFileInput  = document.getElementById("pImgFile");
const imgPreview    = document.getElementById("imgPreview");
const imgPreviewImg = document.getElementById("imgPreviewImg");
const imgRemoveBtn  = document.getElementById("imgRemoveBtn");

imgUploadZone.addEventListener("click", (e) => { if (e.target !== imgRemoveBtn) imgFileInput.click(); });
imgFileInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file || !file.type.startsWith("image/")) { showToast("⚠️ Choisissez une image !"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("⚠️ Image trop lourde (max 5 Mo)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
        currentImageBase64 = ev.target.result;
        imgPreviewImg.src = currentImageBase64;
        imgPreviewImg.style.display = "block";
        imgPreview.style.display = "none";
        imgRemoveBtn.style.display = "block";
    };
    reader.readAsDataURL(file);
});
imgRemoveBtn.addEventListener("click", (e) => { e.stopPropagation(); resetImageUpload(); });

function resetImageUpload() {
    currentImageBase64 = "";
    imgPreviewImg.src = "";
    imgPreviewImg.style.display = "none";
    imgPreview.style.display = "flex";
    imgRemoveBtn.style.display = "none";
    imgFileInput.value = "";
}
function setImagePreview(src) {
    if (src) {
        currentImageBase64 = src;
        imgPreviewImg.src = src;
        imgPreviewImg.style.display = "block";
        imgPreview.style.display = "none";
        imgRemoveBtn.style.display = "block";
    } else resetImageUpload();
}

/* ── GALLERY UPLOAD ── */
const galleryFileInput = document.getElementById("galleryFileInput");
const galleryGrid = document.getElementById("galleryGrid");
const galleryAddBtn = document.getElementById("galleryAddBtn");

galleryAddBtn.addEventListener("click", () => galleryFileInput.click());
galleryFileInput.addEventListener("change", function () {
    const files = Array.from(this.files);
    if (galleryImages.length + files.length > 8) { showToast("⚠️ Maximum 8 photos dans la galerie"); return; }
    files.forEach(file => {
        if (!file.type.startsWith("image/")) return;
        if (file.size > 5 * 1024 * 1024) { showToast("⚠️ " + file.name + " trop lourde (max 5Mo)"); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            galleryImages.push(ev.target.result);
            renderGalleryGrid();
        };
        reader.readAsDataURL(file);
    });
    this.value = "";
});

function renderGalleryGrid() {
    const grid = document.getElementById("galleryGrid");
    grid.innerHTML = galleryImages.map((src, i) => `
        <div class="gallery-thumb">
            <img src="${src}" alt="Photo ${i+1}">
            <button type="button" class="gallery-thumb-remove" onclick="removeGalleryImg(${i})">✕</button>
            <span class="gallery-thumb-num">${i+1}</span>
        </div>
    `).join("");
}

function removeGalleryImg(idx) {
    galleryImages.splice(idx, 1);
    renderGalleryGrid();
}

/* ── MODAL TABS ── */
document.querySelectorAll(".mtab").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".mtab").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".mtab-panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("mtab-" + btn.dataset.mtab)?.classList.add("active");
    });
});

/* ── MODAL ── */
const modalOverlay = document.getElementById("modalOverlay");

function openModal(reset = true) {
    if (reset) {
        document.getElementById("modalTitle").textContent = "Nouvel Article";
        document.getElementById("productForm").reset();
        document.getElementById("editId").value = "";
        editingId = null;
        setEmoji("");
        document.getElementById("availLabel").textContent = "Disponible";
        resetImageUpload();
        galleryImages = [];
        renderGalleryGrid();
        // reset to first tab
        document.querySelectorAll(".mtab").forEach((b,i) => b.classList.toggle("active", i === 0));
        document.querySelectorAll(".mtab-panel").forEach((p,i) => p.classList.toggle("active", i === 0));
    }
    modalOverlay.classList.add("open");
}
function closeModal() { modalOverlay.classList.remove("open"); editingId = null; }

document.getElementById("openModalBtn").addEventListener("click", () => openModal(true));
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);
modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) closeModal(); });

/* ── Emoji picker ── */
function setEmoji(val) {
    selectedEmoji = val;
    document.querySelectorAll(".emoji-opt").forEach(el => el.classList.toggle("active", el.dataset.emoji === val));
}
document.querySelectorAll(".emoji-opt").forEach(el => el.addEventListener("click", () => setEmoji(el.dataset.emoji)));

/* ── Toggle dispo ── */
document.getElementById("pAvailable").addEventListener("change", function () {
    document.getElementById("availLabel").textContent = this.checked ? "Disponible" : "Indisponible";
});

/* ── Submit product form ── */
document.getElementById("productForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const name  = document.getElementById("pName").value.trim();
    const price = parseInt(document.getElementById("pPrice").value);
    const badge = document.getElementById("pBadge").value;
    const desc  = document.getElementById("pDesc").value.trim();
    const cat   = document.getElementById("pCat").value;
    const avail = document.getElementById("pAvailable").checked;
    const img   = currentImageBase64;

    if (!name || !price || !desc) { showToast("⚠️ Remplissez tous les champs obligatoires"); return; }

    if (editingId !== null) {
        const idx = products.findIndex(p => p.id === editingId);
        if (idx !== -1) {
            products[idx] = { ...products[idx], name, price, badge, desc, cat, emoji: selectedEmoji, img, gallery: [...galleryImages], available: avail };
        }
        showToast("✅ Article modifié !");
    } else {
        products.push({ id: nextId(), name, price, badge, desc, cat, emoji: selectedEmoji, img, gallery: [...galleryImages], available: avail });
        showToast("🌟 Nouvel article ajouté !");
    }

    saveProducts();
    renderProducts(document.getElementById("searchInput").value);
    updateStats();
    closeModal();
});

/* ── Edit ── */
function openEdit(id) {
    const p = products.find(pr => pr.id === id);
    if (!p) return;
    editingId = id;
    document.getElementById("modalTitle").textContent = "Modifier l'Article";
    document.getElementById("editId").value = id;
    document.getElementById("pName").value = p.name;
    document.getElementById("pPrice").value = p.price;
    document.getElementById("pBadge").value = p.badge || "";
    document.getElementById("pDesc").value = p.desc;
    document.getElementById("pCat").value = p.cat || "vetements";
    document.getElementById("pAvailable").checked = p.available !== false;
    document.getElementById("availLabel").textContent = p.available !== false ? "Disponible" : "Indisponible";
    setEmoji(p.emoji || "");
    setImagePreview(p.img || "");
    galleryImages = [...(p.gallery || [])];
    renderGalleryGrid();
    // reset to first tab
    document.querySelectorAll(".mtab").forEach((b,i) => b.classList.toggle("active", i === 0));
    document.querySelectorAll(".mtab-panel").forEach((p,i) => p.classList.toggle("active", i === 0));
    openModal(false);
}

/* ── Delete ── */
function deleteProduct(id) {
    const p = products.find(pr => pr.id === id);
    if (!p || !confirm(`Supprimer "${p.name}" ?`)) return;
    products = products.filter(pr => pr.id !== id);
    saveProducts(); renderProducts(document.getElementById("searchInput").value); updateStats();
    showToast("🗑️ Article supprimé.");
}

/* ── Clear all ── */
document.getElementById("clearAllBtn").addEventListener("click", () => {
    if (!confirm("⚠️ Supprimer TOUS les articles ?")) return;
    products = []; saveProducts(); renderProducts(); updateStats();
    showToast("🗑️ Tous les articles supprimés.");
});

/* ── SETTINGS ── */
function loadSettings() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
        try {
            const s = JSON.parse(raw);
            if (s.name)   document.getElementById("shopName").value   = s.name;
            if (s.slogan) document.getElementById("shopSlogan").value = s.slogan;
            if (s.wa)     document.getElementById("shopWa").value     = s.wa;
            if (s.tel)    document.getElementById("shopTel").value    = s.tel;
        } catch {}
    }
}

document.getElementById("settingsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        name: document.getElementById("shopName").value.trim(),
        slogan: document.getElementById("shopSlogan").value.trim(),
        wa: document.getElementById("shopWa").value.trim(),
        tel: document.getElementById("shopTel").value.trim()
    }));
    showToast("💾 Paramètres enregistrés !");
});

/* ── Change password ── */
document.getElementById("pwForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const old = document.getElementById("oldPw").value;
    const newPw = document.getElementById("newPw").value;
    const msgEl = document.getElementById("pwMsg");
    if (old !== getPassword()) { msgEl.textContent = "❌ Ancien mot de passe incorrect"; msgEl.className = "pw-msg err"; return; }
    if (newPw.length < 6) { msgEl.textContent = "❌ Min. 6 caractères"; msgEl.className = "pw-msg err"; return; }
    savePassword(newPw);
    msgEl.textContent = "✅ Mot de passe modifié !"; msgEl.className = "pw-msg ok";
    document.getElementById("pwForm").reset();
    setTimeout(() => msgEl.textContent = "", 4000);
});

/* ══════════════════════════════════════════
   ANALYTIQUES & IA
══════════════════════════════════════════ */

function getOrders() { return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]"); }
function getReviews() { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]"); }

/* Générer données simulées pour demo */
function generateSalesData(days) {
    const orders = getOrders();
    const data = [];
    const labels = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
        labels.push(label);
        // Compter vraies commandes + data simulée pour démo
        const dayOrders = orders.filter(o => {
            if (!o.date) return false;
            const od = new Date(o.date);
            return od.toDateString() === d.toDateString();
        });
        const realTotal = dayOrders.reduce((s, o) => s + (o.total || 0), 0);
        // Ajouter données simulées si aucune vraie commande (pour la démo)
        const simulated = realTotal > 0 ? realTotal : Math.floor(Math.random() * 80000 + 10000);
        data.push(orders.length > 0 ? realTotal : simulated);
    }
    return { labels, data };
}

function renderAnalytics() {
    renderKPIs();
    renderSalesChart(7);
    renderCatChart();
    renderTopProducts();
    renderReviewsAnalysis();
    generateAiSuggestions();
}

function renderKPIs() {
    const orders = getOrders();
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const avgOrder = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;
    const delivered = orders.filter(o => o.status === 'Livré').length;
    const pending = orders.filter(o => o.status === 'En attente' || !o.status).length;

    document.getElementById("kpiRow").innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon">💰</div>
            <div class="kpi-val">${totalRevenue.toLocaleString("fr-FR")}</div>
            <div class="kpi-label">Revenus FCFA</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">📦</div>
            <div class="kpi-val">${orders.length}</div>
            <div class="kpi-label">Commandes</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🎯</div>
            <div class="kpi-val">${avgOrder.toLocaleString("fr-FR")}</div>
            <div class="kpi-label">Panier moyen</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">✅</div>
            <div class="kpi-val">${delivered}</div>
            <div class="kpi-label">Livraisons</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">⏳</div>
            <div class="kpi-val">${pending}</div>
            <div class="kpi-label">En attente</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">👗</div>
            <div class="kpi-val">${products.length}</div>
            <div class="kpi-label">Articles</div>
        </div>
    `;
}

let currentPeriod = 7;
function renderSalesChart(days) {
    currentPeriod = days;
    const { labels, data } = generateSalesData(days);
    const ctx = document.getElementById("salesChart").getContext("2d");
    if (salesChartInstance) salesChartInstance.destroy();
    salesChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Ventes (FCFA)",
                data,
                borderColor: "#e8336d",
                backgroundColor: "rgba(232,51,109,0.08)",
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "#e8336d",
                pointRadius: 4,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => v.toLocaleString("fr-FR") + " F", font: { size: 11 } },
                    grid: { color: "rgba(90,58,40,0.07)" }
                },
                x: { ticks: { font: { size: 10 } }, grid: { display: false } }
            }
        }
    });
}

document.querySelectorAll(".period-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".period-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderSalesChart(parseInt(btn.dataset.period));
    });
});

function renderCatChart() {
    const catCounts = {};
    const catLabels = { vetements: "Vêtements", chaussures: "Chaussures", nouveautes: "Nouveautés" };
    products.forEach(p => { catCounts[p.cat || "vetements"] = (catCounts[p.cat || "vetements"] || 0) + 1; });
    const ctx = document.getElementById("catChart").getContext("2d");
    if (catChartInstance) catChartInstance.destroy();
    const keys = Object.keys(catCounts);
    catChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: keys.map(k => catLabels[k] || k),
            datasets: [{
                data: keys.map(k => catCounts[k]),
                backgroundColor: ["#e8336d","#ff8fb1","#ffccd9","#c9a84c"],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "bottom", labels: { font: { size: 12 }, padding: 16 } }
            },
            cutout: "60%"
        }
    });
}

function renderTopProducts() {
    const orders = getOrders();
    const salesMap = {};
    orders.forEach(o => {
        (o.items || []).forEach(item => {
            salesMap[item.name] = (salesMap[item.name] || 0) + (item.price || 0) * (item.qty || 1);
        });
    });

    // Simuler si pas de commandes
    if (Object.keys(salesMap).length === 0) {
        products.forEach((p, i) => {
            salesMap[p.name] = Math.floor(Math.random() * 200000 + 20000) * (products.length - i);
        });
    }

    const sorted = Object.entries(salesMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted[0]?.[1] || 1;

    document.getElementById("topProducts").innerHTML = sorted.length === 0 ? '<p style="color:#888;font-size:13px;padding:16px">Aucune donnée</p>' :
        sorted.map(([name, rev], i) => `
        <div class="top-product-row">
            <span class="top-rank">${i+1}</span>
            <div class="top-info">
                <span class="top-name">${name}</span>
                <div class="top-bar-wrap">
                    <div class="top-bar" style="width:${Math.round(rev/max*100)}%"></div>
                </div>
            </div>
            <span class="top-rev">${rev.toLocaleString("fr-FR")} F</span>
        </div>
    `).join("");
}

function renderReviewsAnalysis() {
    const reviews = getReviews();
    const container = document.getElementById("reviewsAnalysis");

    if (reviews.length === 0) {
        // Données simulées pour la démo
        const demo = [
            { name: "Aminata K.", rating: 5, comment: "Robe superbe, livraison rapide !" },
            { name: "Jean-Paul D.", rating: 4, comment: "Très belle qualité, je recommande." },
            { name: "Fatou S.", rating: 5, comment: "Parfait ! Exactement comme sur la photo." },
            { name: "Carlos M.", rating: 3, comment: "Correct mais la taille est un peu grande." },
        ];
        const avg = demo.reduce((s, r) => s + r.rating, 0) / demo.length;
        container.innerHTML = `
            <div class="reviews-summary">
                <div class="reviews-score">
                    <div class="reviews-big-score">${avg.toFixed(1)}</div>
                    <div class="reviews-stars">${"⭐".repeat(Math.round(avg))}</div>
                    <div class="reviews-count">${demo.length} avis (démo)</div>
                </div>
                <div class="reviews-list-mini">
                    ${demo.map(r => `
                        <div class="review-mini-card">
                            <div class="review-mini-header">
                                <span class="review-mini-name">${r.name}</span>
                                <span class="review-mini-stars">${"⭐".repeat(r.rating)}</span>
                            </div>
                            <p class="review-mini-text">${r.comment}</p>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
        return;
    }

    const avg = reviews.reduce((s, r) => s + (r.rating || 5), 0) / reviews.length;
    container.innerHTML = `
        <div class="reviews-summary">
            <div class="reviews-score">
                <div class="reviews-big-score">${avg.toFixed(1)}</div>
                <div class="reviews-stars">${"⭐".repeat(Math.round(avg))}</div>
                <div class="reviews-count">${reviews.length} avis</div>
            </div>
            <div class="reviews-list-mini">
                ${reviews.slice(0, 4).map(r => `
                    <div class="review-mini-card">
                        <div class="review-mini-header">
                            <span class="review-mini-name">${r.name || 'Client'}</span>
                            <span class="review-mini-stars">${"⭐".repeat(r.rating || 5)}</span>
                        </div>
                        <p class="review-mini-text">${r.comment || ''}</p>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

/* ── IA Suggestions avec Claude API ── */
async function generateAiSuggestions() {
    const container = document.getElementById("aiSuggestions");
    container.innerHTML = `<div class="ai-loading"><span class="ai-spinner"></span> Analyse IA en cours...</div>`;

    const orders = getOrders();
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const topCat = products.reduce((acc, p) => { acc[p.cat || 'vetements'] = (acc[p.cat || 'vetements'] || 0) + 1; return acc; }, {});
    const topCatName = Object.entries(topCat).sort((a,b) => b[1]-a[1])[0]?.[0] || 'vêtements';
    const avgPrice = products.length > 0 ? Math.round(products.reduce((s,p) => s+p.price, 0) / products.length) : 0;

    const prompt = `Tu es un expert en e-commerce spécialisé en mode africaine. Voici les données de la boutique SK'Shops (Bénin):
- ${products.length} articles au catalogue
- ${orders.length} commandes enregistrées
- Revenus totaux: ${totalRevenue.toLocaleString('fr-FR')} FCFA
- Prix moyen: ${avgPrice.toLocaleString('fr-FR')} FCFA
- Catégorie dominante: ${topCatName}
- ${products.filter(p=>p.badge==='Nouveau').length} articles "Nouveau"
- ${products.filter(p=>!p.available).length} articles indisponibles

Donne 4 suggestions business concrètes et actionnables pour augmenter les ventes. Chaque suggestion doit avoir: un emoji, un titre court, une explication en 2 phrases max. Réponds en JSON: [{"emoji":"🔥","title":"...","text":"..."}]`;

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                messages: [{ role: "user", content: prompt }]
            })
        });
        const data = await response.json();
        const text = data.content?.map(c => c.text || "").join("") || "";
        const clean = text.replace(/```json|```/g, "").trim();
        const suggestions = JSON.parse(clean);
        container.innerHTML = suggestions.map(s => `
            <div class="ai-suggestion-card">
                <span class="ai-sug-emoji">${s.emoji}</span>
                <div>
                    <strong>${s.title}</strong>
                    <p>${s.text}</p>
                </div>
            </div>
        `).join("");
    } catch (err) {
        // Fallback statique
        const fallback = [
            { emoji: "🔥", title: "Boostez vos nouveautés", text: "Mettez en avant les articles avec le badge 'Nouveau' sur la page d'accueil. Les nouveautés génèrent en moyenne 40% plus de clics." },
            { emoji: "📱", title: "Activez WhatsApp Business", text: "Répondez aux commandes WhatsApp en moins de 5 minutes. Les clients convertissent 3× plus vite avec une réponse rapide." },
            { emoji: "💰", title: "Proposez des lots et bundles", text: "Créez des packs (ex: robe + chaussures assorties) avec une remise de 10%. Augmente le panier moyen significativement." },
            { emoji: "📸", title: "Ajoutez plus de photos galerie", text: "Les produits avec 3+ photos galerie convertissent 65% mieux. Profitez de la nouvelle fonctionnalité galerie !" }
        ];
        container.innerHTML = fallback.map(s => `
            <div class="ai-suggestion-card">
                <span class="ai-sug-emoji">${s.emoji}</span>
                <div>
                    <strong>${s.title}</strong>
                    <p>${s.text}</p>
                </div>
            </div>
        `).join("");
    }
}

document.getElementById("refreshAiBtn").addEventListener("click", generateAiSuggestions);

/* ── IA Chat ── */
document.getElementById("aiChatSend").addEventListener("click", sendAiChat);
document.getElementById("aiChatInput").addEventListener("keydown", e => { if (e.key === "Enter") sendAiChat(); });

async function sendAiChat() {
    const input = document.getElementById("aiChatInput");
    const responseEl = document.getElementById("aiChatResponse");
    const q = input.value.trim();
    if (!q) return;

    responseEl.style.display = "block";
    responseEl.innerHTML = `<div class="ai-loading"><span class="ai-spinner"></span> Réponse IA en cours...</div>`;
    input.value = "";

    const orders = getOrders();
    const context = `Tu es un assistant IA expert e-commerce pour SK'Shops (boutique mode au Bénin). 
Données actuelles: ${products.length} articles, ${orders.length} commandes, revenus: ${orders.reduce((s,o)=>s+(o.total||0),0).toLocaleString('fr-FR')} FCFA.
Produits: ${products.slice(0,5).map(p=>`${p.name} (${p.price} FCFA)`).join(', ')}.
Réponds de manière concise, pratique et adaptée au marché béninois.`;

    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 800,
                messages: [
                    { role: "user", content: context + "\n\nQuestion: " + q }
                ]
            })
        });
        const data = await res.json();
        const text = data.content?.map(c => c.text || "").join("") || "Désolé, je n'ai pas pu répondre.";
        responseEl.innerHTML = `
            <div class="ai-chat-answer">
                <span class="ai-chat-icon">🤖</span>
                <div class="ai-chat-text">${text.replace(/\n/g, '<br>')}</div>
            </div>
        `;
    } catch {
        responseEl.innerHTML = `<p style="color:#e04444;font-size:13px">❌ Impossible de joindre l'IA. Vérifiez votre connexion.</p>`;
    }
}