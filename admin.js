/* =============================================
   SK'SHOPS — admin.js
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
const PW_KEY    = "skshops_admin_pw";
const PROD_KEY  = "skshops_products";
const USERS_KEY = "skshops_users";
const ORDERS_KEY = "skshops_orders";

const DEFAULT_PRODUCTS = [
    { id: 1, name: "Robe Élégance Noire", price: 18000, desc: "Robe longue noire, idéale pour soirée.", badge: "Nouveau", emoji: "👗", img: "", available: true, cat: "vetements" },
    { id: 2, name: "Sneaker Urban Blanc", price: 22000, desc: "Sneakers blanches tendance et confortables.", badge: "Bestseller", emoji: "👟", img: "", available: true, cat: "chaussures" },
    { id: 3, name: "Chemise Lin Homme", price: 12000, desc: "Chemise légère en lin, coupe droite.", badge: "Promo", emoji: "👔", img: "", available: true, cat: "vetements" },
    { id: 4, name: "Escarpin Talon Rouge", price: 25000, desc: "Escarpins en cuir verni rouge, talon 8cm.", badge: "Populaire", emoji: "👠", img: "", available: true, cat: "chaussures" }
];

/* ── State ── */
let products = [];
let editingId = null;
let selectedEmoji = "👗";
let currentImageBase64 = "";

/* ── Helpers ── */
function getPassword() { return localStorage.getItem(PW_KEY) || DEFAULT_PASSWORD; }
function savePassword(pw) { localStorage.setItem(PW_KEY, pw); }

function loadProducts() {
    const raw = localStorage.getItem(PROD_KEY);
    if (raw) { try { products = JSON.parse(raw); } catch { products = [...DEFAULT_PRODUCTS]; } }
    else { products = [...DEFAULT_PRODUCTS]; saveProducts(); }
}
function saveProducts() { localStorage.setItem(PROD_KEY, JSON.stringify(products)); }
function nextId() { return products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1; }

/* ── Toast ── */
let toastTimer;
function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
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
    products: { title: "Gestion des Articles", sub: "Ajoutez, modifiez ou supprimez vos articles", showAdd: true },
    orders: { title: "Commandes", sub: "Toutes les commandes clients", showAdd: false },
    clients: { title: "Clients", sub: "Liste des clients inscrits", showAdd: false },
    settings: { title: "Paramètres", sub: "Configurez votre boutique", showAdd: false }
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

    grid.innerHTML = filtered.map(p => `
        <div class="admin-product-card ${!p.available ? 'unavailable' : ''}">
            <div class="admin-card-img">
                ${p.img ? `<img src="${p.img}" alt="${p.name}" onerror="this.remove()">` : ''}
                <span>${p.emoji || "👗"}</span>
                ${p.badge ? `<span class="card-badge ${p.badge==='Nouveau'?'new-badge':''}">${p.badge}</span>` : ''}
                ${!p.available ? '<span class="unavail-tag">Indisponible</span>' : ''}
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
    `).join("");
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
        <div class="orders-table">
            <table>
                <thead><tr><th>#</th><th>Client</th><th>Téléphone</th><th>Total</th><th>Paiement</th><th>Date</th><th>Statut</th></tr></thead>
                <tbody>
                    ${orders.slice().reverse().map(o => `
                        <tr>
                            <td style="font-size:11px;color:#888">#${String(o.id).slice(-6)}</td>
                            <td><strong>${o.nom}</strong></td>
                            <td>${o.tel || '-'}</td>
                            <td style="color:#c9a84c;font-weight:700">${o.total.toLocaleString("fr-FR")} FCFA</td>
                            <td>${o.paiement || '-'}</td>
                            <td>${o.date}</td>
                            <td><span class="order-badge ${o.status==='Livré'?'badge-done':'badge-pending'}">${o.status}</span></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

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

/* ── MODAL ── */
const modalOverlay = document.getElementById("modalOverlay");

function openModal(reset = true) {
    if (reset) {
        document.getElementById("modalTitle").textContent = "Nouvel Article";
        document.getElementById("productForm").reset();
        document.getElementById("editId").value = "";
        editingId = null;
        setEmoji("👗");
        document.getElementById("availLabel").textContent = "Disponible";
        resetImageUpload();
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
        if (idx !== -1) { products[idx] = { ...products[idx], name, price, badge, desc, cat, emoji: selectedEmoji, img, available: avail }; }
        showToast("✅ Article modifié !");
    } else {
        products.push({ id: nextId(), name, price, badge, desc, cat, emoji: selectedEmoji, img, available: avail });
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
    setEmoji(p.emoji || "👗");
    setImagePreview(p.img || "");
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
const SETTINGS_KEY = "skshops_settings";

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