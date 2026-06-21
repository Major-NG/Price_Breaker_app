// --- CONFIGURATION API ---
const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5000/api' : '/api';

// --- STATE MANAGEMENT ---
const STATE = {
    token: localStorage.getItem('token') || null,
    role: localStorage.getItem('role') || 'CLIENT_SIMPLE', // 'client', 'partenaire', 'admin' ou 'CLIENT_SIMPLE' (visiteur)
    nom: localStorage.getItem('nom') || '',
    products: [],
    topProducts: [],
    revenue: 0
};

// --- DOM ELEMENTS ---
// Header & Login
const authSection = document.getElementById('auth-section');
const userInfoSection = document.getElementById('user-info-section');
const userWelcome = document.getElementById('user-welcome');
const btnLoginModal = document.getElementById('btn-login-modal');
const btnRegisterModal = document.getElementById('btn-register-modal');
const btnLogout = document.getElementById('btn-logout');

// Modals
const authModal = document.getElementById('auth-modal');
const statsModal = document.getElementById('stats-modal');
const closeModal = document.querySelector('.close-modal');
const closeStatsModal = document.querySelector('.close-stats-modal');

// Auth Form
const authForm = document.getElementById('auth-form');
const modalTitle = document.getElementById('modal-title');
// Product Modal Elements
const productModal = document.getElementById('product-modal');
const closeProductModal = document.querySelector('.close-product-modal');
const productForm = document.getElementById('product-form');
const productModalTitle = document.getElementById('product-modal-title');
const productId = document.getElementById('product-id');
const productNom = document.getElementById('product-nom');
const productPrixPublic = document.getElementById('product-prix-public');
const productPrixPartenaire = document.getElementById('product-prix-partenaire');
const productCategorie = document.getElementById('product-categorie');
const productImage = document.getElementById('product-image');
const productStock = document.getElementById('product-stock');
const productAllowDiscount = document.getElementById('product-allow-discount');
const rgpdAuthContainer = document.getElementById('rgpd-auth-container');
const rgpdAuthCheckbox = document.getElementById('rgpd-auth');
const inputNom = document.getElementById('nom');
const inputEmail = document.getElementById('email');
const inputTelephone = document.getElementById('telephone');
const inputPassword = document.getElementById('password');
const selectRole = document.getElementById('role');
const authError = document.getElementById('auth-error');
const btnAuthSubmit = document.getElementById('btn-auth-submit');


// Layout Elements
const adminDashboard = document.getElementById('admin-dashboard');
const adminProductShortcut = document.getElementById('admin-product-shortcut');
const adminRequests = document.getElementById('admin-requests');
const partnerBanner = document.getElementById('partner-banner');
const partnerActionsContainer = document.getElementById('partner-actions');
const categoriesContainer = document.getElementById('categories-container');

// Stats Elements
const statsRevenue = document.getElementById('stats-revenue');
const statsTopProducts = document.getElementById('stats-top-products');

let authMode = 'login'; // 'login' | 'register' | 'admin_pwd' | 'admin_info'

// --- INITIALIZATION ---
async function init() {
    setupEventListeners();
    updateAuthUI();
    loadAllSiteSettings();
    initHeroCarousel();
    initFlashCountdown();
    initScrollTop();
    initSearchListeners();
    setupPartnerUI();
    await fetchProducts();
    updateWishlistBadge();

    if (STATE.role === 'admin') {
        renderAdminDashboard();
    }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Auth Buttons
    btnLoginModal.addEventListener('click', () => openAuthModal(true));
    btnRegisterModal.addEventListener('click', () => openAuthModal(false));
    btnLogout.addEventListener('click', logout);

    // Modal Close
    closeModal.addEventListener('click', () => authModal.classList.add('hidden'));
    closeStatsModal.addEventListener('click', () => statsModal.classList.add('hidden'));
    if (closeProductModal) closeProductModal.addEventListener('click', () => productModal.classList.add('hidden'));

    // Forms Submit
    authForm.addEventListener('submit', handleAuthSubmit);
    if (productForm) productForm.addEventListener('submit', handleProductSubmit);

    // Switch Admin
    }

// --- AUTHENTICATION ---
function setAuthMode(mode) {
    authMode = mode;
    authError.classList.add('hidden');
    authForm.reset();

    // Default hidden
    inputNom.classList.add('hidden');
    inputEmail.classList.add('hidden');
    inputTelephone.classList.add('hidden');
    inputPassword.classList.add('hidden');
    selectRole.classList.add('hidden');
    

    inputNom.removeAttribute('required');
    inputEmail.removeAttribute('required');
    inputTelephone.removeAttribute('required');
    inputPassword.removeAttribute('required');
    inputPassword.placeholder = 'Mot de passe';
    if(rgpdAuthContainer) rgpdAuthContainer.classList.add('hidden');
    if(rgpdAuthCheckbox) rgpdAuthCheckbox.removeAttribute('required');

    if (authMode === 'login') {
        modalTitle.textContent = 'Connexion';
        inputEmail.classList.remove('hidden');
        inputEmail.setAttribute('required', 'true');
        inputPassword.classList.remove('hidden');
        inputPassword.setAttribute('required', 'true');
        
        
        btnAuthSubmit.textContent = 'Valider';
    } else if (authMode === 'register') {
        modalTitle.textContent = 'Inscription';
        inputNom.classList.remove('hidden');
        inputNom.setAttribute('required', 'true');
        inputEmail.classList.remove('hidden');
        inputEmail.setAttribute('required', 'true');
        inputPassword.classList.remove('hidden');
        inputPassword.setAttribute('required', 'true');
        selectRole.classList.remove('hidden');
        if(rgpdAuthContainer) rgpdAuthContainer.classList.remove('hidden');
        if(rgpdAuthCheckbox) rgpdAuthCheckbox.setAttribute('required', 'true');
        btnAuthSubmit.textContent = 'Valider';
    } else if (authMode === 'admin_pwd') {
        modalTitle.textContent = 'Accès RESTREINT Admin';
        inputPassword.classList.remove('hidden');
        inputPassword.setAttribute('required', 'true');
        inputPassword.placeholder = "Mot de passe d'administration";
        btnAuthSubmit.textContent = 'Vérifier';
        
        
    } else if (authMode === 'admin_info') {
        modalTitle.textContent = 'Informations de l\'Admin';
        inputNom.classList.remove('hidden');
        inputNom.setAttribute('required', 'true');
        inputEmail.classList.remove('hidden');
        inputEmail.setAttribute('required', 'true');
        inputTelephone.classList.remove('hidden');
        inputTelephone.setAttribute('required', 'true');
        btnAuthSubmit.textContent = 'Enregistrer et Connexion';
    }
}

function openAuthModal(isLogin) {
    setAuthMode(isLogin ? 'login' : 'register');
    authModal.classList.remove('hidden');
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    authError.classList.add('hidden');

    try {
        const email = inputEmail.value;
        const password = inputPassword.value;

        if (authMode === 'login' || authMode === 'admin_pwd') {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, mot_de_passe: password })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Erreur de connexion');

            STATE.token = data.token;
            STATE.role = data.role;
            STATE.nom = data.nom || email;
            
            localStorage.setItem('token', STATE.token);
            localStorage.setItem('role', STATE.role);
            localStorage.setItem('nom', STATE.nom);
            localStorage.setItem('last-email', email);

        } else if (authMode === 'register') {
            const nom = inputNom.value;
            const role = selectRole.value;

            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom, email, mot_de_passe: password, role })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Erreur d\'inscription');

            localStorage.setItem('last-email', email);

            alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
            setAuthMode('login');
            return;
        }

        authModal.classList.add('hidden');
        updateAuthUI();
        await fetchProducts();

        if (STATE.role === 'admin') {
            renderAdminDashboard();
        } else {
            adminDashboard.classList.add('hidden');
        }

    } catch (error) {
        authError.textContent = error.message;
        authError.classList.remove('hidden');
        console.error('Auth Error:', error);
    }
}

function logout() {
    STATE.token = null;
    STATE.role = 'CLIENT_SIMPLE';
    STATE.nom = '';
    
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('nom');

    updateAuthUI();
    adminDashboard.classList.add('hidden');
    fetchProducts();
}

function updateAuthUI() {
    if (STATE.token) {
        authSection.classList.add('hidden');
        userInfoSection.classList.remove('hidden');
        userWelcome.textContent = `👤 Bienvenue, ${STATE.nom} (${STATE.role})`;
    } else {
        authSection.classList.remove('hidden');
        userInfoSection.classList.add('hidden');
    }
    setupPartnerUI();
    if (STATE.role === 'admin') renderAdminDashboard();
}

// --- API FETCH (PRODUITS & STATS) ---
async function fetchProducts() {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (STATE.token) headers['Authorization'] = `Bearer ${STATE.token}`;

        const res = await fetch(`${API_BASE_URL}/products`, { headers });
        
        if (res.ok) {
            STATE.products = await res.json();
        } else {
            console.warn("Erreur API lors de la récupération des produits.");
            STATE.products = [];
        }

        renderProducts();
        populateCategoryFilter();
        renderQuickCategories();
        renderFlashSale();
    } catch (error) {
        console.error("Erreur récupération produits:", error);
        STATE.products = [];
        renderProducts();
    }
}

async function fetchStats() {
    if (STATE.role !== 'admin') return;

    try {
        const headers = { 'Authorization': `Bearer ${STATE.token}` };
        
        const resRev = await fetch(`${API_BASE_URL}/stats/revenue`, { headers });
        if (resRev.ok) {
            const data = await resRev.json();
            STATE.revenue = data.revenue;
        }

        const resTop = await fetch(`${API_BASE_URL}/stats/top-products`, { headers });
        if (resTop.ok) {
            STATE.topProducts = await resTop.json();
        }

        // MAJ UI Modal des Stats
        statsRevenue.textContent = STATE.revenue !== null && STATE.revenue !== undefined ? `${STATE.revenue} FCFA` : 'Non disponible (Backend off)';
        
        statsTopProducts.innerHTML = '';
        if (STATE.topProducts.length > 0) {
            STATE.topProducts.forEach(p => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${p.nom}</span> <strong>${p.total_vendu} ventes</strong>`;
                statsTopProducts.appendChild(li);
            });
        } else {
            statsTopProducts.innerHTML = '<li>Aucune donnée disponible.</li>';
        }
        
        statsModal.classList.remove('hidden');

    } catch (error) {
        console.error("Erreur chargement statistiques :", error);
        alert('Erreur lors du chargement des statistiques. Le backend est-il lancé ?');
    }
}

// --- RENDER PIPELINE ---
/**
 * Affiche le tableau de bord Admin
 */
function renderAdminDashboard() {
    if (STATE.role === 'admin') {
        adminDashboard.classList.remove('hidden');
    } else {
        adminDashboard.classList.add('hidden');
    }
}

/**
 * Affiche la grille des cartes de catégories et produits dynamiquement
 */
function renderProducts() {
    categoriesContainer.innerHTML = '';
    
    // Vérifier les droits du compte connecté
    const isPartner = STATE.role === 'partenaire' || STATE.role === 'admin';
    const isAdmin = STATE.role === 'admin';

    // Regrouper par catégorie
    const categoriesMap = {};
    STATE.products.forEach(product => {
        const cat = product.categorie || 'Non classé';
        if (!categoriesMap[cat]) categoriesMap[cat] = [];
        categoriesMap[cat].push(product);
    });

    if (isAdmin && adminProductShortcut) {
        adminProductShortcut.classList.remove('hidden');
    } else if (adminProductShortcut) {
        adminProductShortcut.classList.add('hidden');
    }

    Object.keys(categoriesMap).forEach(categoryName => {
        // Section de catégorie
        const catSection = document.createElement('div');
        catSection.className = 'category-section';
        catSection.innerHTML = `<h3 class="category-title">${categoryName}</h3>`;

        // Grille pour les produits
        const grid = document.createElement('div');
        grid.className = 'grid';

        categoriesMap[categoryName].forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            let priceHtml = '';
            if (isAdmin) {
                // Admin voit tout sans rien barrer
                priceHtml = `
                    <span class="public-price admin-public">${product.prix_public} FCFA (Public)</span>
                    <span class="partner-price admin-partner">${product.prix_partenaire} FCFA (Partenaire)</span>
                `;
            } else if (isPartner && product.prix_partenaire) {
                priceHtml = `
                    <span class="public-price crossed">${product.prix_public} FCFA (Public)</span>
                    <span class="partner-price">${product.prix_partenaire} FCFA (Partenaire)</span>
                `;
            } else {
                priceHtml = `<span class="public-price">${product.prix_public} FCFA</span>`;
            }

            let adminActions = '';
            let addToCartBtn = `<button class="btn-add-cart">Ajouter au panier</button>`;
            
            if (isAdmin) {
                addToCartBtn = ''; // Pas de panier pour l'admin
                adminActions = `
                    <div class="admin-card-actions">
                        <button class="btn-admin edit" title="Modifier le produit" onclick="editProduct(${product.id})"><i data-lucide="edit" style="width:16px;height:16px;"></i></button>
                        <button class="btn-admin delete" title="Supprimer le produit" onclick="deleteProduct(${product.id})"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
                    </div>
                `;
            }

            card.innerHTML = `
                ${adminActions}
                <div class="product-image">
                    <img src="${product.image_url}" alt="${product.nom}">
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.nom}</h3>
                    <div class="price-container">
                        ${priceHtml}
                    </div>
                    ${addToCartBtn}
                </div>
            `;
            
            grid.appendChild(card);
        });

        catSection.appendChild(grid);
        categoriesContainer.appendChild(catSection);
    });
}

// --- CRUD Produit ---
async function deleteProduct(id) {
    if(!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
        const res = await fetch(`${API_BASE_URL}/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${STATE.token}` }
        });
        if (!res.ok) throw new Error('Erreur réseau.');
        
        STATE.products = STATE.products.filter(p => p.id !== id);
        renderProducts();
    } catch(err) {
        alert('Erreur lors de la suppression.');
    }
}

window.openProductModal = function(product = null) {
    if (product) {
        productModalTitle.textContent = "Modifier le Produit";
        productId.value = product.id;
        productNom.value = product.nom;
        productPrixPublic.value = product.prix_public;
        productPrixPartenaire.value = product.prix_partenaire;
        productCategorie.value = product.categorie || 'Non classé';
        productImage.value = product.image_url;
        if(productStock) productStock.value = product.stock !== undefined ? product.stock : 100;
        if(productAllowDiscount) productAllowDiscount.checked = product.allow_discount !== 0 && product.allow_discount !== false && product.allow_discount !== "0";
    } else {
        productModalTitle.textContent = "Nouveau Produit";
        productForm.reset();
        productId.value = '';
        productImage.value = 'assets/LOGO_Price_Breaker.jpeg';
        if(productStock) productStock.value = 100;
        if(productAllowDiscount) productAllowDiscount.checked = true;
    }
    productModal.classList.remove('hidden');
}

window.editProduct = function(id) {
    const product = STATE.products.find(p => p.id === id);
    if (product) openProductModal(product);
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const id = productId.value;
    const newProduct = {
        nom: productNom.value,
        prix_public: parseFloat(productPrixPublic.value),
        prix_partenaire: parseFloat(productPrixPartenaire.value),
        categorie: productCategorie.value,
        image_url: productImage.value || 'assets/LOGO_Price_Breaker.jpeg',
        stock: productStock ? (parseInt(productStock.value) || 0) : 100,
        allow_discount: productAllowDiscount ? (productAllowDiscount.checked ? 1 : 0) : 1
    };

    try {
        const method = id ? 'PUT' : 'POST';
        const endpoint = id ? `${API_BASE_URL}/products/${id}` : `${API_BASE_URL}/products`;
        
        const res = await fetch(endpoint, {
            method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${STATE.token}` 
            },
            body: JSON.stringify(newProduct)
        });
        
        if (!res.ok) throw new Error('Erreur API');
        
        productModal.classList.add('hidden');
        await fetchProducts(); // Recharger les produits depuis le backend
    } catch(err) {
        alert('Erreur lors de la sauvegarde du produit.');
    }
}

// Démarrage de l'application
document.addEventListener('DOMContentLoaded', init);

// ============================================================
//  CART (PANIER) — STATE & LOGIC
// ============================================================

const LIVRAISON_SEUIL = 50000;
const LIVRAISON_FRAIS = 3500;
const PROMO_CODES = {
    'PRICEBREAKER10': 0.10,
    'WELCOME20': 0.20,
};

let cartDiscount = 0; // active promo discount (0–1)

// Extend STATE with cart
STATE.cart = JSON.parse(localStorage.getItem('cart') || '[]');

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(STATE.cart));
}

function cartCount() {
    return STATE.cart.reduce((s, i) => s + i.quantite, 0);
}

function updateCartBadge() {
    const count = cartCount();
    document.getElementById('cart-count').textContent = count;
}

// Add product to cart (called from render)
window.addToCart = function(id) {
    if (STATE.role === 'admin') return; // admins don't add to cart
    const product = STATE.products.find(p => p.id === id);
    if (!product) return;

    const existing = STATE.cart.find(i => i.id === id);
    if (existing) {
        existing.quantite++;
    } else {
        STATE.cart.push({ ...product, quantite: 1 });
    }
    saveCart();
    updateCartBadge();
    showToast(`✅ ${product.nom} ajouté au panier`);
};

// Simple toast notification
function showToast(msg) {
    let toast = document.getElementById('price-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'price-toast';
        toast.style.cssText = `
            position:fixed; bottom:24px; right:24px; z-index:9999;
            background:#222; color:#fff; border:1px solid var(--green-brand);
            padding:12px 20px; border-radius:8px; font-size:0.9rem;
            box-shadow:0 4px 20px rgba(0,0,0,0.5); transition:opacity 0.4s;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// Cart Modal
function openCartModal() {
    renderCart();
    document.getElementById('cart-modal').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    const closeCartBtn = document.getElementById('close-cart-modal');
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', () =>
            document.getElementById('cart-modal').classList.add('hidden')
        );
    }
});

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const emptyMsg  = document.getElementById('cart-empty-msg');
    const recap     = document.getElementById('cart-recap');

    if (STATE.cart.length === 0) {
        container.innerHTML = '';
        emptyMsg.style.display = 'block';
        recap.style.display = 'none';
        return;
    }

    emptyMsg.style.display = 'none';
    recap.style.display = 'block';

    const isPartner = STATE.role === 'partenaire';
    container.innerHTML = STATE.cart.map(item => {
        const unitPrice = isPartner && item.prix_partenaire
            ? item.prix_partenaire
            : item.prix_public;
        const totalPrice = unitPrice * item.quantite;
        return `
            <div class="cart-item" id="cart-item-${item.id}">
                <img class="cart-item-img" src="${item.image_url}" alt="${item.nom}"
                     onerror="this.src='assets/LOGO_Price_Breaker.jpeg'">
                <div class="cart-item-info">
                    <h4>${item.nom}</h4>
                    <p>${item.categorie || ''} — ${unitPrice.toLocaleString()} FCFA / unité</p>
                </div>
                <div class="cart-item-right">
                    <span class="cart-item-price">${totalPrice.toLocaleString()} FCFA</span>
                    <div class="qty-ctrl">
                        <button onclick="changeQty(${item.id}, -1)">−</button>
                        <span class="qty-val">${item.quantite}</span>
                        <button onclick="changeQty(${item.id}, +1)">+</button>
                    </div>
                    <button class="cart-item-del" onclick="removeFromCart(${item.id})">🗑 Retirer</button>
                </div>
            </div>
        `;
    }).join('');

    updateCartRecap();
}

window.changeQty = function(id, delta) {
    const item = STATE.cart.find(i => i.id === id);
    if (!item) return;
    
    if (delta > 0 && item.quantite + delta > (item.stock !== undefined ? item.stock : 100)) {
        showToast(`Désolé, seulement ${item.stock} en stock !`, true);
        return;
    }
    
    item.quantite += delta;
    if (item.quantite <= 0) STATE.cart = STATE.cart.filter(i => i.id !== id);
    saveCart();
    updateCartBadge();
    renderCart();
};

window.removeFromCart = function(id) {
    STATE.cart = STATE.cart.filter(i => i.id !== id);
    saveCart();
    updateCartBadge();
    renderCart();
    showToast('Article retiré du panier');
};

function updateCartRecap() {
    const isPartner = STATE.role === 'partenaire';

    const totalQty = STATE.cart.reduce((s, item) => s + item.quantite, 0);
    
    let volumeDiscount = 0;
    if (totalQty >= 50) volumeDiscount = 0.12;
    else if (totalQty >= 30) volumeDiscount = 0.08;
    else if (totalQty >= 10) volumeDiscount = 0.05;

    const subtotal = STATE.cart.reduce((s, item) => {
        const basePrice = isPartner && item.prix_partenaire
            ? item.prix_partenaire : item.prix_public;
            
        const isEligibleForVolumeDiscount = item.allow_discount !== 0 && item.allow_discount !== false && item.allow_discount !== "0";
        const itemVolumeDiscount = isEligibleForVolumeDiscount ? volumeDiscount : 0;
        
        const appliedDiscount = Math.max(cartDiscount, itemVolumeDiscount);
        
        return s + (basePrice * (1 - appliedDiscount)) * item.quantite;
    }, 0);

    const afterDiscount = subtotal;
    const livraison = afterDiscount >= LIVRAISON_SEUIL ? 0 : LIVRAISON_FRAIS;
    const total = afterDiscount + livraison;

    document.getElementById('cart-subtotal').textContent =
        Math.round(afterDiscount).toLocaleString() + ' FCFA';

    const livEl = document.getElementById('cart-livraison');
    if (livraison === 0) {
        livEl.textContent = '✓ Gratuite';
        livEl.style.color = 'var(--green-neon)';
    } else {
        livEl.textContent = livraison.toLocaleString() + ' FCFA';
        livEl.style.color = '';
    }

    document.getElementById('cart-total').textContent =
        Math.round(total).toLocaleString() + ' FCFA';

    const infoEl = document.getElementById('cart-livraison-info');
    if (livraison > 0) {
        const manque = LIVRAISON_SEUIL - Math.round(afterDiscount);
        infoEl.textContent = `Plus que ${manque.toLocaleString()} FCFA pour la livraison gratuite !`;
        infoEl.style.color = '#f59e0b';
    } else {
        infoEl.textContent = '🎉 Vous bénéficiez de la livraison gratuite !';
        infoEl.style.color = 'var(--green-neon)';
    }
}

window.applyCartPromo = function() {
    const code  = (document.getElementById('cart-code-promo').value || '').trim().toUpperCase();
    const msgEl = document.getElementById('cart-promo-msg');

    if (PROMO_CODES[code] !== undefined) {
        cartDiscount = PROMO_CODES[code];
        msgEl.textContent = `✓ Code appliqué ! −${cartDiscount * 100}% sur votre commande`;
        msgEl.className = 'promo-msg ok';
    } else {
        cartDiscount = 0;
        msgEl.textContent = '✗ Code invalide ou expiré';
        msgEl.className = 'promo-msg err';
    }
    updateCartRecap();
};

window.passerCommande = function() {
    if (!STATE.token) {
        showToast('Connectez-vous pour passer commande !');
        document.getElementById('cart-modal').classList.add('hidden');
        setTimeout(() => openAuthModal(true), 800);
        return;
    }
    openCheckoutModal();
};

// Patch renderProducts to wire addToCart properly
const _origRenderProducts = renderProducts;
renderProducts = function() {
    _origRenderProducts();
    // Re-attach addToCart to all "Ajouter au panier" buttons
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
        // The product id is stored as data attribute — we rebuild onclick via inner HTML
        // so nothing extra needed here; onclick is already set in render.
    });
    updateCartBadge();
};

// Override the card rendering to pass product id
const _origCardClick = renderProducts; // already patched above

// Patch the original renderProducts to attach product id on cart button
const __origRP = window.renderProducts || renderProducts;

// Re-define renderProducts with cart integration + enhanced UI
window.renderProductsWithCart = function() {
    const products = getFilteredProducts();
    categoriesContainer.innerHTML = '';
    const isPartner = STATE.role === 'partenaire' || STATE.role === 'admin';
    const isAdmin   = STATE.role === 'admin';
    const viewMode  = STATE.productView || 'grid';

    const categoriesMap = {};
    products.forEach(product => {
        const cat = product.categorie || 'Non classé';
        if (!categoriesMap[cat]) categoriesMap[cat] = [];
        categoriesMap[cat].push(product);
    });

    const countEl = document.getElementById('products-count');
    if (countEl) countEl.textContent = `${products.length} produit${products.length > 1 ? 's' : ''} affiché${products.length > 1 ? 's' : ''}`;

    if (isAdmin && adminProductShortcut) {
        adminProductShortcut.classList.remove('hidden');
    } else if (adminProductShortcut) {
        adminProductShortcut.classList.add('hidden');
    }

    if (products.length === 0) {
        categoriesContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">Aucun produit trouvé.</p>';
        return;
    }

    Object.keys(categoriesMap).forEach(categoryName => {
        const catSection = document.createElement('div');
        catSection.className = 'category-section fade-in';
        catSection.innerHTML = `<h3 class="category-title">${categoryName}</h3>`;

        const grid = document.createElement('div');
        grid.className = 'grid' + (viewMode === 'list' ? ' list-view' : '');

        categoriesMap[categoryName].forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.productId = product.id;

            let priceHtml = '';
            if (isAdmin) {
                priceHtml = `
                    <span class="public-price admin-public">${product.prix_public.toLocaleString()} FCFA (Public)</span>
                    <span class="partner-price admin-partner">${product.prix_partenaire.toLocaleString()} FCFA (Partenaire)</span>
                `;
            } else if (isPartner && product.prix_partenaire) {
                const isDiscounter = product.prix_public > product.prix_partenaire;
                const economy = product.prix_public - product.prix_partenaire;
                
                if (isDiscounter) {
                    priceHtml = `
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <span class="public-price crossed" style="text-decoration: line-through; font-size: 0.85em; color: var(--text-muted);">${product.prix_public.toLocaleString()} FCFA (Prix Public)</span>
                            <span class="partner-price" style="font-size: 1.25em; color: var(--primary-color); font-weight: bold;">${product.prix_partenaire.toLocaleString()} FCFA</span>
                            <span style="font-size: 0.8rem; color: var(--green-neon); font-weight: bold; background: rgba(0,255,0,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block; width: max-content;">Économie : ${economy.toLocaleString()} FCFA</span>
                        </div>
                    `;
                } else {
                    priceHtml = `
                        <span class="public-price crossed">${product.prix_public.toLocaleString()} FCFA (Public)</span>
                        <span class="partner-price">${product.prix_partenaire.toLocaleString()} FCFA (Partenaire)</span>
                    `;
                }
            } else {
                priceHtml = `<span class="public-price">${product.prix_public.toLocaleString()} FCFA</span>`;
            }

            const badge = getProductBadge(product);
            const favActive = isInWishlist(product.id) ? 'active' : '';
            let adminActions = '';
            let actionsHtml = '';

            if (isAdmin) {
                adminActions = `
                    <div class="admin-card-actions">
                        <button class="btn-admin edit" title="Modifier" onclick="editProduct(${product.id})"><i data-lucide="edit" style="width:16px;height:16px;"></i></button>
                        <button class="btn-admin delete" title="Supprimer" onclick="deleteProduct(${product.id})"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
                    </div>`;
            } else {
                const addCartBtn = product.stock <= 0 
                    ? `<button class="btn-add-cart" style="background:#444; color:#999; cursor:not-allowed;" disabled>Rupture de stock</button>`
                    : `<button class="btn-add-cart" onclick="addToCart(${product.id})">Ajouter au panier</button>`;
                    
                actionsHtml = `
                    <div class="card-actions-row">
                        <button class="btn-quickview" onclick="openQuickView(${product.id})">👁 Aperçu</button>
                        <button class="btn-fav ${favActive}" onclick="toggleWishlist(${product.id})">❤️</button>
                    </div>
                    ${addCartBtn}`;
            }

            card.innerHTML = `
                ${adminActions}
                ${badge}
                <div class="product-image" onclick="trackRecentView(${product.id});openQuickView(${product.id})" style="cursor:pointer;">
                    <img src="${product.image_url}" alt="${product.nom}" onerror="this.src='assets/LOGO_Price_Breaker.jpeg'">
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.nom}</h3>
                    <div class="price-container">${priceHtml}</div>
                    ${actionsHtml}
                </div>`;
            grid.appendChild(card);
        });

        catSection.appendChild(grid);
        categoriesContainer.appendChild(catSection);
    });

    updateCartBadge();
    renderRecentProducts();
};

// Override global renderProducts with the cart-integrated version
// We do this after DOMContentLoaded to avoid issues
document.addEventListener('DOMContentLoaded', () => {
    // Replace renderProducts globally
    window.renderProducts = window.renderProductsWithCart;
    // Re-call to apply
    if (STATE.products.length > 0) renderProducts();
    updateCartBadge();
});

// ============================================================
//  CONTACT FORM
// ============================================================

window.handleContactSubmit = function(e) {
    e.preventDefault();
    const btn   = document.getElementById('btn-envoyer');
    const texte = btn.querySelector('.btn-texte');
    const loader = btn.querySelector('.btn-loader');
    texte.style.display  = 'none';
    loader.style.display = 'inline';

    setTimeout(() => {
        texte.style.display  = 'inline';
        loader.style.display = 'none';
        document.getElementById('form-succes').style.display = 'block';
        document.getElementById('contact-form').reset();
        document.getElementById('char-count').textContent = '0 / 500';
        setTimeout(() => {
            document.getElementById('form-succes').style.display = 'none';
        }, 5000);
    }, 1200);
};

window.updateCharCount = function() {
    const ta = document.getElementById('c-message');
    const cc = document.getElementById('char-count');
    if (ta && cc) {
        const len = Math.min(ta.value.length, 500);
        ta.value = ta.value.slice(0, 500);
        cc.textContent = `${len} / 500`;
        cc.style.color = len >= 450 ? 'var(--red-brand)' : 'var(--text-muted)';
    }
};

// Set open/closed badge on contact section
document.addEventListener('DOMContentLoaded', () => {
    const badge = document.getElementById('badge-open');
    if (!badge) return;
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 6=Sat
    const h   = now.getHours();
    const isSun = day === 0;
    const open  = isSun ? (h >= 10 && h < 17) : (h >= 8 && h < 20);
    badge.textContent = open ? '🟢 Ouvert maintenant' : '🔴 Fermé';
    badge.style.background = open ? 'var(--green-brand)' : '#555';
});

// ============================================================
//  FAQ TOGGLE
// ============================================================

window.toggleFaq = function(btn) {
    const reponse = btn.nextElementSibling;
    const icone   = btn.querySelector('.faq-icone');
    const isOpen  = reponse.style.display === 'block';
    reponse.style.display = isOpen ? 'none' : 'block';
    icone.textContent     = isOpen ? '+' : '−';
    icone.style.transform = isOpen ? '' : 'rotate(180deg)';
};

// ============================================================
//  DARK / LIGHT THEME TOGGLE
// ============================================================

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('price-theme', theme);
    const btn = document.getElementById('btn-theme');
    if (btn) btn.textContent = theme === 'light' ? '🌑' : '🌙';
}

window.toggleTheme = function() {
    const current = document.body.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
};

// Apply saved theme on startup
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('price-theme') || 'dark';
    applyTheme(saved);
});

// ============================================================
//  HAMBURGER / MOBILE MENU
// ============================================================

window.toggleMobileMenu = function() {
    const nav  = document.getElementById('main-nav');
    const btn  = document.getElementById('hamburger');
    if (!nav || !btn) return;
    const open = nav.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
};

window.closeMobileMenu = function() {
    const nav  = document.getElementById('main-nav');
    const btn  = document.getElementById('hamburger');
    if (!nav || !btn) return;
    nav.classList.remove('open');
    btn.classList.remove('open');
};

// Close nav on outside click
document.addEventListener('click', (e) => {
    const nav = document.getElementById('main-nav');
    const btn = document.getElementById('hamburger');
    if (nav && btn && nav.classList.contains('open')) {
        if (!nav.contains(e.target) && !btn.contains(e.target)) {
            closeMobileMenu();
        }
    }
});

// ============================================================
//  ADMIN CONTACT INFO EDITOR
// ============================================================

// Default contact info (overridden by localStorage)
// Default contact info (overridden by API)
const DEFAULT_CONTACT = {
    email:     'contact@pricebreaker.com',
    wa1:       '+237 6XX XXX XXX',
    wa2:       '+237 6XX XXX XXX',
    call:      '+237 6XX XXX XXX',
    address:   'Yaoundé, Cameroun',
    hoursWeek: '8h–20h',
    hoursSun:  '10h–17h',
    mapsUrl:   'https://maps.google.com'
};

async function loadContactInfo() {
    try {
        const res = await fetch(`${API_BASE_URL}/settings/contact`);
        if (res.ok) {
            const data = await res.json();
            if (data.value) {
                return { ...DEFAULT_CONTACT, ...JSON.parse(data.value) };
            }
        }
    } catch (e) {
        console.warn("Impossible de charger les contacts API:", e);
    }
    const saved = JSON.parse(localStorage.getItem('price-contact') || 'null');
    return saved ? { ...DEFAULT_CONTACT, ...saved } : { ...DEFAULT_CONTACT };
}

function applyContactInfoToDOM(info) {
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    const setHref = (id, href) => { const el = document.getElementById(id); if (el) el.href = href; };

    set('ci-email', info.email);
    setHref('ci-email-link', `mailto:${info.email}`);

    set('ci-wa1', info.wa1);
    set('ci-wa2', info.wa2);
    const wa1Number = (info.wa1 || '').replace(/\D/g, '');
    setHref('ci-wa1-link', `https://wa.me/${wa1Number}`);

    set('ci-address', info.address);
    setHref('ci-maps-link', info.mapsUrl || '#');
    set('top-bar-phone', info.call || info.wa1);

    const hoursEl = document.getElementById('ci-hours');
    if (hoursEl) hoursEl.innerHTML = `Lun–Sam : ${info.hoursWeek}<br>Dim : ${info.hoursSun}`;
}

window.openContactEditor = async function() {
    if (STATE.role !== 'admin') return;
    const info = await loadContactInfo();

    document.getElementById('ce-email').value      = info.email || '';
    document.getElementById('ce-wa1').value        = info.wa1 || '';
    document.getElementById('ce-wa2').value        = info.wa2 || '';
    if(document.getElementById('ce-call')) document.getElementById('ce-call').value = info.call || '';
    document.getElementById('ce-address').value    = info.address || '';
    if(document.getElementById('ce-maps-url')) document.getElementById('ce-maps-url').value = info.mapsUrl || '';
    document.getElementById('ce-hours-week').value = info.hoursWeek || '';
    document.getElementById('ce-hours-sun').value  = info.hoursSun || '';

    document.getElementById('contact-editor-modal').classList.remove('hidden');
};

window.saveContactInfo = async function(e) {
    e.preventDefault();
    const info = {
        email:     document.getElementById('ce-email').value.trim(),
        wa1:       document.getElementById('ce-wa1').value.trim(),
        wa2:       document.getElementById('ce-wa2').value.trim(),
        call:      document.getElementById('ce-call') ? document.getElementById('ce-call').value.trim() : '',
        address:   document.getElementById('ce-address').value.trim(),
        mapsUrl:   document.getElementById('ce-maps-url') ? document.getElementById('ce-maps-url').value.trim() : '',
        hoursWeek: document.getElementById('ce-hours-week').value.trim(),
        hoursSun:  document.getElementById('ce-hours-sun').value.trim(),
    };
    
    localStorage.setItem('price-contact', JSON.stringify(info));
    applyContactInfoToDOM(info);
    
    const token = localStorage.getItem('price-auth-token');
    if (token) {
        try {
            await fetch(`${API_BASE_URL}/settings/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ value: JSON.stringify(info) })
            });
        } catch (err) {
            console.warn("Backend non joignable");
        }
    }
    
    document.getElementById('contact-editor-modal').classList.add('hidden');
    showToast('✅ Informations de contact mises à jour !');
};

// Wire up close button for contact editor
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-contact-editor');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('contact-editor-modal').classList.add('hidden');
        });
    }
    loadContactInfo().then(info => applyContactInfoToDOM(info));
});

// ============================================================
//  SITE CMS — localStorage (Admin full control, no backend)
// ============================================================

const DEFAULT_SITE = {
    topbar: '🚚 Livraison gratuite dès 50 000 FCFA — Commandez par téléphone :',
    hero: [
        { title: 'Cassez les Prix, <br><span class="highlight">Boostez vos Marges</span>', desc: 'La référence des accessoires électroniques et de la connectique.' },
        { title: 'Prix <span class="highlight">Partenaires</span> Exclusifs', desc: 'Devenez revendeur et accédez à des tarifs de gros imbattables.' },
        { title: 'Livraison <span class="highlight">Rapide</span> 24–48h', desc: 'Yaoundé, Douala et toutes les villes du Cameroun.' }
    ],
    services: [
        { title: 'Livraison rapide', desc: 'À partir de 24h' },
        { title: 'Produits authentiques', desc: '100% garantis' },
        { title: 'Service après-vente', desc: 'SAV agréé' },
        { title: 'Retour facile', desc: 'Sous 7 jours' }
    ],
    flashSubtitle: 'Offres limitées — Ne manquez pas !',
    newsletterTitle: 'Recevez nos offres exclusives',
    newsletterDesc: 'Inscrivez-vous et obtenez jusqu\'à 10% de réduction sur votre première commande.',
    footerTagline: 'La référence des accessoires électroniques en Afrique centrale.',
    flashConfig: { durationHours: 24, productIds: [2, 4, 6, 10], discount: 15, endTime: null },
    customCategories: [],
    customFaq: [],
    orders: [],
    partnerRequests: [],
    newsletterSubs: []
};

function loadSiteData() {
    const saved = JSON.parse(localStorage.getItem('price-site-data') || 'null');
    return saved ? deepMerge(DEFAULT_SITE, saved) : { ...DEFAULT_SITE };
}

function saveSiteData(data) {
    localStorage.setItem('price-site-data', JSON.stringify(data));
}

function deepMerge(target, source) {
    const out = { ...target };
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            out[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            out[key] = source[key];
        }
    }
    return out;
}

let SITE_DATA = loadSiteData();

function loadAllSiteSettings() {
    SITE_DATA = loadSiteData();
    applySiteContentToDOM();
    syncPromoCodesFromSite();
    syncCategoriesToSelect();
}

function applySiteContentToDOM() {
    const msg = document.getElementById('top-bar-msg');
    if (msg) {
        let cleanText = (SITE_DATA.topbar || '').replace(/\+237 6XX XXX XXX/g, '').trim();
        msg.innerHTML = `${cleanText} <span id="top-bar-phone"></span>`;
        // Ré-appliquer le téléphone si les contacts sont déjà chargés
        loadContactInfo().then(info => {
            const phoneEl = document.getElementById('top-bar-phone');
            if (phoneEl) phoneEl.textContent = info.call || info.wa1;
        });
    }

    SITE_DATA.hero.forEach((slide, i) => {
        const titleEl = document.getElementById(`hero-title-${i}`) || document.querySelector(`[data-slide="${i}"] h2`);
        const descEl  = document.getElementById(`hero-desc-${i}`);
        const slideEl = document.querySelector(`.hero-slide[data-slide="${i}"]`);
        if (slideEl) {
            const h2 = slideEl.querySelector('h2');
            const p  = slideEl.querySelector('p');
            if (h2) h2.innerHTML = slide.title;
            if (p)  p.textContent = slide.desc;
        }
        if (titleEl) titleEl.innerHTML = slide.title;
        if (descEl)  descEl.textContent = slide.desc;
    });

    SITE_DATA.services.forEach((svc, i) => {
        const t = document.getElementById(`svc-title-${i}`);
        const d = document.getElementById(`svc-desc-${i}`);
        if (t) t.textContent = svc.title;
        if (d) d.textContent = svc.desc;
    });

    const flashSub = document.getElementById('flash-subtitle');
    if (flashSub) flashSub.textContent = SITE_DATA.flashSubtitle;

    const nt = document.getElementById('newsletter-title');
    const nd = document.getElementById('newsletter-desc');
    if (nt) nt.textContent = SITE_DATA.newsletterTitle;
    if (nd) nd.textContent = SITE_DATA.newsletterDesc;

    const ft = document.getElementById('footer-tagline');
    if (ft) ft.textContent = SITE_DATA.footerTagline;

    renderFaqFromData();
}

function renderFaqFromData() {
    const faqList = document.querySelector('.faq-liste');
    if (!faqList) return;
    const items = SITE_DATA.customFaq.length > 0 ? SITE_DATA.customFaq : null;
    if (!items) return;
    faqList.innerHTML = items.map(item => `
        <div class="faq-item">
            <button class="faq-question" onclick="toggleFaq(this)">${item.q}<span class="faq-icone">+</span></button>
            <div class="faq-reponse">${item.a}</div>
        </div>`).join('');
}

// --- Hero Carousel ---
let heroIndex = 0;
let heroTimer = null;

function initHeroCarousel() {
    const dotsContainer = document.getElementById('hero-dots');
    const slides = document.querySelectorAll('.hero-slide');
    if (!dotsContainer || !slides.length) return;

    dotsContainer.innerHTML = '';
    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Slide ${i + 1}`);
        dot.onclick = () => goToHeroSlide(i);
        dotsContainer.appendChild(dot);
    });

    heroTimer = setInterval(() => heroNext(), 5000);
}

window.heroNext = function() {
    const slides = document.querySelectorAll('.hero-slide');
    goToHeroSlide((heroIndex + 1) % slides.length);
};

window.heroPrev = function() {
    const slides = document.querySelectorAll('.hero-slide');
    goToHeroSlide((heroIndex - 1 + slides.length) % slides.length);
};

function goToHeroSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots   = document.querySelectorAll('.hero-dot');
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    heroIndex = index;
    if (slides[index]) slides[index].classList.add('active');
    if (dots[index]) dots[index].classList.add('active');
}

// --- Flash Sale ---
function initFlashCountdown() {
    const cfg = SITE_DATA.flashConfig;
    if (!cfg.endTime) {
        cfg.endTime = Date.now() + (cfg.durationHours || 24) * 3600000;
        saveSiteData(SITE_DATA);
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const cfg = SITE_DATA.flashConfig;
    const remaining = Math.max(0, (cfg.endTime || Date.now()) - Date.now());
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val).padStart(2, '0'); };
    set('cd-hours', h);
    set('cd-mins', m);
    set('cd-secs', s);
}

function renderFlashSale() {
    const grid = document.getElementById('flash-grid');
    if (!grid) return;
    const cfg = SITE_DATA.flashConfig;
    const ids = cfg.productIds || [2, 4, 6, 10];
    const discount = (cfg.discount || 15) / 100;
    const flashProducts = STATE.products.filter(p => ids.includes(p.id));

    if (flashProducts.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-muted);">Aucune offre flash configurée.</p>';
        return;
    }

    grid.innerHTML = flashProducts.map(p => {
        const newPrice = Math.round(p.prix_public * (1 - discount));
        const stock = 20 + (p.id % 30);
        const sold  = 5 + (p.id % 15);
        const pct   = Math.round((sold / stock) * 100);
        return `
            <div class="flash-card fade-in">
                <span class="flash-badge">-${Math.round(discount * 100)}%</span>
                <div class="flash-card-img">
                    <img src="${p.image_url}" alt="${p.nom}" onerror="this.src='assets/LOGO_Price_Breaker.jpeg'">
                </div>
                <div class="flash-card-body">
                    <h4>${p.nom}</h4>
                    <div class="flash-prices">
                        <span class="flash-old-price">${p.prix_public.toLocaleString()} FCFA</span>
                        <span class="flash-new-price">${newPrice.toLocaleString()} FCFA</span>
                    </div>
                    <div class="flash-progress"><div class="flash-progress-bar" style="width:${pct}%"></div></div>
                    <p class="flash-stock">${sold} vendus — ${stock - sold} restants</p>
                    <button class="btn-add-cart" onclick="addToCart(${p.id})">Ajouter au panier</button>
                </div>
            </div>`;
    }).join('');
}

// --- Search ---
STATE.searchQuery = '';
STATE.filterCategory = '';
STATE.sortOrder = 'default';
STATE.productView = localStorage.getItem('price-view') || 'grid';

function initSearchListeners() {
    const input = document.getElementById('header-search');
    if (!input) return;
    input.addEventListener('input', () => showSearchSuggestions(input.value));
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); performSearch(); }
    });
    document.addEventListener('click', e => {
        const sug = document.getElementById('search-suggestions');
        if (sug && !e.target.closest('.header-search-wrap')) sug.classList.add('hidden');
    });
}

function showSearchSuggestions(query) {
    const sug = document.getElementById('search-suggestions');
    if (!sug) return;
    if (!query || query.length < 2) { sug.classList.add('hidden'); return; }

    const matches = STATE.products.filter(p =>
        p.nom.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 6);

    if (matches.length === 0) { sug.classList.add('hidden'); return; }

    sug.innerHTML = matches.map(p => `
        <div class="search-suggestion-item" onclick="selectSearchProduct(${p.id})">
            <img src="${p.image_url}" alt="" onerror="this.src='assets/LOGO_Price_Breaker.jpeg'">
            <span>${p.nom} — ${p.prix_public.toLocaleString()} FCFA</span>
        </div>`).join('');
    sug.classList.remove('hidden');
}

window.selectSearchProduct = function(id) {
    document.getElementById('search-suggestions').classList.add('hidden');
    openQuickView(id);
};

window.performSearch = function() {
    const input = document.getElementById('header-search');
    STATE.searchQuery = (input?.value || '').trim().toLowerCase();
    const banner = document.getElementById('search-results-banner');
    if (banner) {
        if (STATE.searchQuery) {
            banner.classList.remove('hidden');
            banner.innerHTML = `Résultats pour « <strong>${STATE.searchQuery}</strong> » <button onclick="clearSearch()">✕ Effacer</button>`;
        } else {
            banner.classList.add('hidden');
        }
    }
    renderProducts();
    document.getElementById('produits')?.scrollIntoView({ behavior: 'smooth' });
};

window.clearSearch = function() {
    STATE.searchQuery = '';
    const input = document.getElementById('header-search');
    if (input) input.value = '';
    document.getElementById('search-results-banner')?.classList.add('hidden');
    renderProducts();
};

window.applyProductFilters = function() {
    STATE.filterCategory = document.getElementById('filter-category')?.value || '';
    STATE.sortOrder = document.getElementById('sort-products')?.value || 'default';
    renderProducts();
};

function getFilteredProducts() {
    let list = [...STATE.products];
    if (STATE.searchQuery) {
        list = list.filter(p => p.nom.toLowerCase().includes(STATE.searchQuery));
    }
    if (STATE.filterCategory) {
        list = list.filter(p => p.categorie === STATE.filterCategory);
    }
    const isPartner = STATE.role === 'partenaire';
    if (STATE.sortOrder === 'price-asc') {
        list.sort((a, b) => (isPartner ? a.prix_partenaire : a.prix_public) - (isPartner ? b.prix_partenaire : b.prix_public));
    } else if (STATE.sortOrder === 'price-desc') {
        list.sort((a, b) => (isPartner ? b.prix_partenaire : b.prix_public) - (isPartner ? a.prix_partenaire : a.prix_public));
    } else if (STATE.sortOrder === 'name-asc') {
        list.sort((a, b) => a.nom.localeCompare(b.nom));
    }
    return list;
}

function populateCategoryFilter() {
    const sel = document.getElementById('filter-category');
    if (!sel) return;
    const cats = [...new Set(STATE.products.map(p => p.categorie).filter(Boolean))];
    SITE_DATA.customCategories.forEach(c => { if (!cats.includes(c)) cats.push(c); });
    sel.innerHTML = '<option value="">Toutes catégories</option>' +
        cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function renderQuickCategories() {
    const container = document.getElementById('quick-cats');
    if (!container) return;
    const cats = [...new Set(STATE.products.map(p => p.categorie).filter(Boolean))];
    container.innerHTML = `<button class="cat-pill active" data-cat="" onclick="filterByCategoryPill('')">Tous</button>` +
        cats.map(c => `<button class="cat-pill" data-cat="${encodeURIComponent(c)}" onclick="filterByCategoryPill(decodeURIComponent('${encodeURIComponent(c)}'))">${c}</button>`).join('');
}

window.filterByCategoryPill = function(cat) {
    STATE.filterCategory = cat;
    const sel = document.getElementById('filter-category');
    if (sel) sel.value = cat;
    document.querySelectorAll('.cat-pill').forEach(p => {
        const pCat = p.dataset.cat !== undefined ? decodeURIComponent(p.dataset.cat || '') : '';
        p.classList.toggle('active', pCat === cat);
    });
    renderProducts();
    document.getElementById('produits')?.scrollIntoView({ behavior: 'smooth' });
};

window.setProductView = function(mode) {
    STATE.productView = mode;
    localStorage.setItem('price-view', mode);
    document.getElementById('btn-view-grid')?.classList.toggle('active', mode === 'grid');
    document.getElementById('btn-view-list')?.classList.toggle('active', mode === 'list');
    renderProducts();
};

function getProductBadge(product) {
    if (product.stock <= 0) {
        return '<span class="product-badge" style="background:var(--danger-color); color:white;">RUPTURE</span>';
    }
    if (product.stock < 10) {
        return '<span class="product-badge" style="background:#f59e0b; color:white;">STOCK FAIBLE</span>';
    }
    if (product.categorie?.includes('Promotions') || product.categorie?.includes('<i data-lucide="flame" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>')) {
        return '<span class="product-badge promo">PROMO</span>';
    }
    if (product.categorie?.includes('Nouveautés') || product.categorie?.includes('<i data-lucide="sparkles" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>')) {
        return '<span class="product-badge">NOUVEAU</span>';
    }
    if (product.categorie?.includes('Meilleures')) {
        return '<span class="product-badge">TOP VENTE</span>';
    }
    return '';
}

// --- Wishlist ---
STATE.wishlist = JSON.parse(localStorage.getItem('price-wishlist') || '[]');

function saveWishlist() {
    localStorage.setItem('price-wishlist', JSON.stringify(STATE.wishlist));
}

function isInWishlist(id) {
    return STATE.wishlist.includes(id);
}

function updateWishlistBadge() {
    const el = document.getElementById('wishlist-count');
    if (el) el.textContent = STATE.wishlist.length;
}

window.toggleWishlist = function(id) {
    const idx = STATE.wishlist.indexOf(id);
    if (idx === -1) {
        STATE.wishlist.push(id);
        showToast('❤️ Ajouté aux favoris');
    } else {
        STATE.wishlist.splice(idx, 1);
        showToast('Retiré des favoris');
    }
    saveWishlist();
    updateWishlistBadge();
    renderProducts();
};

window.openWishlistModal = function() {
    const modal = document.getElementById('wishlist-modal');
    const container = document.getElementById('wishlist-items');
    const empty = document.getElementById('wishlist-empty');
    const items = STATE.products.filter(p => STATE.wishlist.includes(p.id));

    if (items.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
    } else {
        empty.style.display = 'none';
        container.innerHTML = items.map(p => `
            <div class="cart-item">
                <img class="cart-item-img" src="${p.image_url}" alt="${p.nom}">
                <div class="cart-item-info"><h4>${p.nom}</h4><p>${p.prix_public.toLocaleString()} FCFA</p></div>
                <div class="cart-item-right">
                    <button class="btn-primary" style="padding:6px 12px;font-size:0.8rem;" onclick="addToCart(${p.id})">Ajouter</button>
                    <button class="cart-item-del" onclick="toggleWishlist(${p.id});openWishlistModal()">Retirer</button>
                </div>
            </div>`).join('');
    }
    modal.classList.remove('hidden');
};

window.closeWishlistModal = function() {
    document.getElementById('wishlist-modal').classList.add('hidden');
};

// --- Quick View ---
window.openQuickView = function(id) {
    const p = STATE.products.find(x => x.id === id);
    if (!p) return;
    trackRecentView(id);
    const isPartner = STATE.role === 'partenaire';
    const price = isPartner && p.prix_partenaire ? p.prix_partenaire : p.prix_public;
    const body = document.getElementById('quickview-body');
    body.innerHTML = `
        <div class="quickview-img">
            <img src="${p.image_url}" alt="${p.nom}" onerror="this.src='assets/LOGO_Price_Breaker.jpeg'">
        </div>
        <div class="quickview-info">
            <h3>${p.nom}</h3>
            <p class="quickview-cat">${p.categorie || ''}</p>
            <p class="quickview-desc">Accessoire électronique de qualité premium. Garantie incluse. Livraison rapide au Cameroun.</p>
            <p class="public-price" style="font-size:1.5rem;margin-bottom:16px;">${price.toLocaleString()} FCFA</p>
            <div class="quickview-actions">
                ${STATE.role !== 'admin' ? `<button class="btn-primary" onclick="addToCart(${p.id});closeQuickView()">🛒 Ajouter au panier</button>` : ''}
                <button class="btn-fav ${isInWishlist(p.id) ? 'active' : ''}" onclick="toggleWishlist(${p.id})">❤️ Favoris</button>
            </div>
        </div>`;
    document.getElementById('quickview-modal').classList.remove('hidden');
};

window.closeQuickView = function() {
    document.getElementById('quickview-modal').classList.add('hidden');
};

// --- Recently Viewed ---
STATE.recentViews = JSON.parse(localStorage.getItem('price-recent') || '[]');

window.trackRecentView = function(id) {
    STATE.recentViews = STATE.recentViews.filter(x => x !== id);
    STATE.recentViews.unshift(id);
    STATE.recentViews = STATE.recentViews.slice(0, 8);
    localStorage.setItem('price-recent', JSON.stringify(STATE.recentViews));
};

function renderRecentProducts() {
    const section = document.getElementById('recent-section');
    const grid = document.getElementById('recent-grid');
    if (!section || !grid) return;
    const items = STATE.recentViews.map(id => STATE.products.find(p => p.id === id)).filter(Boolean);
    if (items.length === 0) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    grid.innerHTML = items.map(p => `
        <div class="recent-card" onclick="openQuickView(${p.id})">
            <img src="${p.image_url}" alt="${p.nom}" onerror="this.src='assets/LOGO_Price_Breaker.jpeg'">
            <p>${p.nom}</p>
        </div>`).join('');
}

// --- Checkout ---
window.openCheckoutModal = function() {
    if (STATE.cart.length === 0) { showToast('Panier vide !'); return; }
    const isPartner = STATE.role === 'partenaire';
    const subtotal = STATE.cart.reduce((s, i) => s + (isPartner && i.prix_partenaire ? i.prix_partenaire : i.prix_public) * i.quantite, 0);
    const afterDisc = subtotal * (1 - cartDiscount);
    const liv = afterDisc >= LIVRAISON_SEUIL ? 0 : LIVRAISON_FRAIS;
    const total = afterDisc + liv;

    document.getElementById('checkout-recap').innerHTML = `
        <p>${STATE.cart.length} article(s)</p>
        <p>Sous-total : <strong>${Math.round(afterDisc).toLocaleString()} FCFA</strong></p>
        <p>Livraison : ${liv === 0 ? 'Gratuite' : liv.toLocaleString() + ' FCFA'}</p>
        <p style="margin-top:8px;">TOTAL : <strong>${Math.round(total).toLocaleString()} FCFA</strong></p>`;

    document.getElementById('cart-modal').classList.add('hidden');
    document.getElementById('checkout-modal').classList.remove('hidden');
};

window.closeCheckoutModal = function() {
    document.getElementById('checkout-modal').classList.add('hidden');
};

window.submitCheckout = function(e) {
    e.preventDefault();
    const order = {
        id: Date.now(),
        nom: document.getElementById('co-nom').value,
        tel: document.getElementById('co-tel').value,
        ville: document.getElementById('co-ville').value,
        adresse: document.getElementById('co-adresse').value,
        paiement: document.getElementById('co-paiement').value,
        items: [...STATE.cart],
        total: document.getElementById('checkout-recap').querySelector('strong')?.textContent || '',
        date: new Date().toLocaleString('fr-FR'),
        status: 'pending'
    };
    SITE_DATA.orders = SITE_DATA.orders || [];
    SITE_DATA.orders.unshift(order);
    saveSiteData(SITE_DATA);
    localStorage.setItem('price-orders', JSON.stringify(SITE_DATA.orders));

    showToast('✅ Commande confirmée ! Merci 🎉');
    STATE.cart = [];
    saveCart();
    updateCartBadge();
    closeCheckoutModal();
    document.getElementById('checkout-form').reset();
};

// --- Newsletter ---
window.handleNewsletterSubmit = function(e) {
    e.preventDefault();
    const email = document.getElementById('newsletter-email').value.trim();
    SITE_DATA.newsletterSubs = SITE_DATA.newsletterSubs || [];
    if (!SITE_DATA.newsletterSubs.includes(email)) {
        SITE_DATA.newsletterSubs.push(email);
        saveSiteData(SITE_DATA);
    }
    document.getElementById('newsletter-form').style.display = 'none';
    document.getElementById('newsletter-success').classList.remove('hidden');
    showToast('✅ Inscription newsletter réussie !');
};

// --- Scroll Top ---
function initScrollTop() {
    const btn = document.getElementById('scroll-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
        btn.classList.toggle('hidden', window.scrollY < 400);
    });
}

window.scrollToTop = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.closeTopBar = function() {
    document.getElementById('top-bar')?.classList.add('hidden-bar');
    localStorage.setItem('price-topbar-closed', '1');
};

// --- Partner UI ---
function setupPartnerUI() {
    if (localStorage.getItem('price-topbar-closed')) {
        document.getElementById('top-bar')?.classList.add('hidden-bar');
    }

    const container = document.getElementById('partner-actions');
    if (!container) return;

    if (STATE.role === 'client' || (STATE.token && STATE.role !== 'partenaire' && STATE.role !== 'admin')) {
        container.innerHTML = `<button class="btn-partner-request" onclick="requestPartnership()">🤝 Devenir partenaire</button>`;
    } else if (STATE.role === 'partenaire') {
        partnerBanner?.classList.add('hidden');
    }

    document.getElementById('btn-view-grid')?.classList.toggle('active', STATE.productView === 'grid');
    document.getElementById('btn-view-list')?.classList.toggle('active', STATE.productView === 'list');
}

window.requestPartnership = function() {
    if (!STATE.token) {
        showToast('Connectez-vous d\'abord !');
        openAuthModal(true);
        return;
    }
    const req = { nom: STATE.nom, email: localStorage.getItem('last-email') || '', date: new Date().toLocaleString('fr-FR'), status: 'pending' };
    SITE_DATA.partnerRequests = SITE_DATA.partnerRequests || [];
    SITE_DATA.partnerRequests.push(req);
    saveSiteData(SITE_DATA);
    partnerBanner?.classList.remove('hidden');
    showToast('✅ Demande de partenariat envoyée !');
};

// --- Admin CMS Panels ---
window.closeModalById = function(id) {
    document.getElementById(id)?.classList.add('hidden');
};

function requireAdmin() {
    if (STATE.role !== 'admin') { showToast('Accès réservé à l\'administrateur'); return false; }
    return true;
}

window.openSiteEditor = function() {
    if (!requireAdmin()) return;
    const d = SITE_DATA;
    document.getElementById('se-topbar').value = d.topbar;
    d.hero.forEach((s, i) => {
        const t = document.getElementById(`se-hero${i + 1}-title`);
        const desc = document.getElementById(`se-hero${i + 1}-desc`);
        if (t) t.value = s.title.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (desc) desc.value = s.desc;
    });
    document.getElementById('se-flash-sub').value = d.flashSubtitle;
    document.getElementById('se-news-title').value = d.newsletterTitle;
    document.getElementById('se-news-desc').value = d.newsletterDesc;
    document.getElementById('se-footer-tag').value = d.footerTagline;
    d.services.forEach((s, i) => {
        const t = document.getElementById(`se-svc${i}-t`);
        const desc = document.getElementById(`se-svc${i}-d`);
        if (t) t.value = s.title;
        if (desc) desc.value = s.desc;
    });
    document.getElementById('site-editor-modal').classList.remove('hidden');
};

window.saveSiteContent = function(e) {
    e.preventDefault();
    if (!requireAdmin()) return;
    SITE_DATA.topbar = document.getElementById('se-topbar').value;
    SITE_DATA.hero = [1, 2, 3].map(i => {
        let title = document.getElementById(`se-hero${i}-title`).value;
        if (title && !title.includes('<')) {
            const parts = title.split(',');
            if (parts.length > 1) {
                title = parts[0].trim() + ', <span class="highlight">' + parts.slice(1).join(',').trim() + '</span>';
            }
        }
        return { title, desc: document.getElementById(`se-hero${i}-desc`).value };
    });
    SITE_DATA.flashSubtitle = document.getElementById('se-flash-sub').value;
    SITE_DATA.newsletterTitle = document.getElementById('se-news-title').value;
    SITE_DATA.newsletterDesc = document.getElementById('se-news-desc').value;
    SITE_DATA.footerTagline = document.getElementById('se-footer-tag').value;
    SITE_DATA.services = [0, 1, 2, 3].map(i => ({
        title: document.getElementById(`se-svc${i}-t`).value,
        desc: document.getElementById(`se-svc${i}-d`).value
    }));
    saveSiteData(SITE_DATA);
    applySiteContentToDOM();
    closeModalById('site-editor-modal');
    showToast('✅ Contenu du site mis à jour !');
};

window.openPromoEditor = function() {
    if (!requireAdmin()) return;
    renderPromoList();
    document.getElementById('promo-editor-modal').classList.remove('hidden');
};

function syncPromoCodesFromSite() {
    const saved = JSON.parse(localStorage.getItem('price-promo-codes') || 'null');
    if (saved) Object.assign(PROMO_CODES, saved);
}

function renderPromoList() {
    const list = document.getElementById('promo-list');
    if (!list) return;
    list.innerHTML = Object.entries(PROMO_CODES).map(([code, pct]) => `
        <li><span><strong>${code}</strong> — ${Math.round(pct * 100)}%</span>
        <button onclick="removePromoCode('${code}')">Supprimer</button></li>`).join('');
}

window.addPromoCode = function() {
    const code = (document.getElementById('new-promo-code').value || '').trim().toUpperCase();
    const pct  = parseInt(document.getElementById('new-promo-pct').value) / 100;
    if (!code || !pct) return;
    PROMO_CODES[code] = pct;
    localStorage.setItem('price-promo-codes', JSON.stringify(PROMO_CODES));
    renderPromoList();
    showToast(`Code ${code} ajouté`);
};

window.removePromoCode = function(code) {
    delete PROMO_CODES[code];
    localStorage.setItem('price-promo-codes', JSON.stringify(PROMO_CODES));
    renderPromoList();
};

window.openCategoryEditor = function() {
    if (!requireAdmin()) return;
    renderCategoryList();
    document.getElementById('category-editor-modal').classList.remove('hidden');
};

function syncCategoriesToSelect() {
    const sel = document.getElementById('product-categorie');
    if (!sel) return;
    const defaults = [...sel.options].map(o => o.value);
    SITE_DATA.customCategories.forEach(cat => {
        if (!defaults.includes(cat)) {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            sel.appendChild(opt);
        }
    });
}

function renderCategoryList() {
    const list = document.getElementById('category-list');
    const allCats = [...new Set([...STATE.products.map(p => p.categorie), ...SITE_DATA.customCategories].filter(Boolean))];
    list.innerHTML = allCats.map(c => `
        <li><span>${c}</span><button onclick="removeCategory('${c.replace(/'/g, "\\'")}')">Supprimer</button></li>`).join('');
}

window.addCategory = function() {
    const name = document.getElementById('new-category-name').value.trim();
    if (!name) return;
    SITE_DATA.customCategories = SITE_DATA.customCategories || [];
    if (!SITE_DATA.customCategories.includes(name)) SITE_DATA.customCategories.push(name);
    saveSiteData(SITE_DATA);
    syncCategoriesToSelect();
    populateCategoryFilter();
    renderCategoryList();
    showToast(`Catégorie « ${name} » ajoutée`);
};

window.removeCategory = function(name) {
    SITE_DATA.customCategories = (SITE_DATA.customCategories || []).filter(c => c !== name);
    saveSiteData(SITE_DATA);
    renderCategoryList();
};

window.openFaqEditor = function() {
    if (!requireAdmin()) return;
    renderFaqAdminList();
    document.getElementById('faq-editor-modal').classList.remove('hidden');
};

function renderFaqAdminList() {
    const list = document.getElementById('faq-admin-list');
    const items = SITE_DATA.customFaq.length > 0 ? SITE_DATA.customFaq : getDefaultFaq();
    list.innerHTML = items.map((item, i) => `
        <li><span>${item.q}</span><button onclick="removeFaqItem(${i})">Supprimer</button></li>`).join('');
}

function getDefaultFaq() {
    return [
        { q: 'Comment devenir partenaire revendeur ?', a: 'Créez un compte et sélectionnez Partenaire.' },
        { q: 'Quels sont les délais de livraison ?', a: 'Yaoundé 24h, autres villes 48h.' },
        { q: 'Puis-je retourner un produit ?', a: 'Oui, sous 7 jours.' },
        { q: 'Les produits sont-ils garantis ?', a: 'Garantie 1 à 6 mois.' }
    ];
}

window.addFaqItem = function() {
    const q = document.getElementById('new-faq-q').value.trim();
    const a = document.getElementById('new-faq-a').value.trim();
    if (!q || !a) return;
    SITE_DATA.customFaq = SITE_DATA.customFaq.length > 0 ? SITE_DATA.customFaq : getDefaultFaq();
    SITE_DATA.customFaq.push({ q, a });
    saveSiteData(SITE_DATA);
    renderFaqAdminList();
    renderFaqFromData();
    showToast('FAQ mise à jour');
};

window.removeFaqItem = function(index) {
    if (SITE_DATA.customFaq.length === 0) SITE_DATA.customFaq = getDefaultFaq();
    SITE_DATA.customFaq.splice(index, 1);
    saveSiteData(SITE_DATA);
    renderFaqAdminList();
    renderFaqFromData();
};

window.openOrdersPanel = function() {
    if (!requireAdmin()) return;
    const orders = SITE_DATA.orders || JSON.parse(localStorage.getItem('price-orders') || '[]');
    const list = document.getElementById('orders-list');
    if (orders.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);">Aucune commande pour le moment.</p>';
    } else {
        list.innerHTML = orders.map(o => `
            <div class="order-card">
                <div class="order-card-header">
                    <span>#${o.id} — ${o.nom}</span>
                    <span class="order-status ${o.status}">${o.status === 'pending' ? 'En attente' : 'Validée'}</span>
                </div>
                <p>📱 ${o.tel} | 📍 ${o.ville} — ${o.adresse}</p>
                <p>💳 ${o.paiement} | 📅 ${o.date}</p>
                <p>${o.items?.length || 0} article(s) — <strong>${o.total}</strong></p>
                <div class="order-card-actions">
                    <button class="btn-order-ok" onclick="updateOrderStatus(${o.id},'validated')">✓ Valider</button>
                    <button class="btn-order-del" onclick="deleteOrder(${o.id})">Supprimer</button>
                </div>
            </div>`).join('');
    }
    document.getElementById('orders-panel-modal').classList.remove('hidden');
};

window.updateOrderStatus = function(id, status) {
    SITE_DATA.orders = (SITE_DATA.orders || []).map(o => o.id === id ? { ...o, status } : o);
    saveSiteData(SITE_DATA);
    openOrdersPanel();
    showToast('Commande mise à jour');
};

window.deleteOrder = function(id) {
    SITE_DATA.orders = (SITE_DATA.orders || []).filter(o => o.id !== id);
    saveSiteData(SITE_DATA);
    openOrdersPanel();
};

window.openPartnersPanel = function() {
    if (!requireAdmin()) return;
    const reqs = SITE_DATA.partnerRequests || [];
    const list = document.getElementById('partners-list');
    if (reqs.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);">Aucune demande partenaire.</p>';
    } else {
        list.innerHTML = reqs.map((r, i) => `
            <div class="order-card">
                <div class="order-card-header"><span>${r.nom}</span><span class="order-status pending">En attente</span></div>
                <p>📧 ${r.email || '—'} | 📅 ${r.date}</p>
                <div class="order-card-actions">
                    <button class="btn-order-ok" onclick="validatePartner(${i})">✓ Approuver</button>
                    <button class="btn-order-del" onclick="rejectPartner(${i})">Refuser</button>
                </div>
            </div>`).join('');
    }
    document.getElementById('partners-panel-modal').classList.remove('hidden');
};

window.validatePartner = function(index) {
    SITE_DATA.partnerRequests.splice(index, 1);
    saveSiteData(SITE_DATA);
    showToast('✅ Partenaire approuvé (notification simulée)');
    openPartnersPanel();
};

window.rejectPartner = function(index) {
    SITE_DATA.partnerRequests.splice(index, 1);
    saveSiteData(SITE_DATA);
    openPartnersPanel();
};

window.openFlashEditor = function() {
    if (!requireAdmin()) return;
    const cfg = SITE_DATA.flashConfig;
    document.getElementById('fe-duration').value = cfg.durationHours || 24;
    document.getElementById('fe-product-ids').value = (cfg.productIds || []).join(',');
    document.getElementById('fe-discount').value = cfg.discount || 15;
    document.getElementById('flash-editor-modal').classList.remove('hidden');
};

window.saveFlashConfig = function(e) {
    e.preventDefault();
    if (!requireAdmin()) return;
    const hours = parseInt(document.getElementById('fe-duration').value);
    const ids   = document.getElementById('fe-product-ids').value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const disc  = parseInt(document.getElementById('fe-discount').value);
    SITE_DATA.flashConfig = { durationHours: hours, productIds: ids, discount: disc, endTime: Date.now() + hours * 3600000 };
    saveSiteData(SITE_DATA);
    renderFlashSale();
    closeModalById('flash-editor-modal');
    showToast('⚡ Vente Flash reconfigurée !');
};

window.exportSiteData = function() {
    if (!requireAdmin()) return;
    const data = {
        site: SITE_DATA,
        products: STATE.products,
        promos: PROMO_CODES,
        contact: loadContactInfo()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pricebreaker-backup.json';
    a.click();
    showToast('💾 Export téléchargé');
};

window.importSiteData = function() {
    if (!requireAdmin()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.site) { SITE_DATA = deepMerge(DEFAULT_SITE, data.site); saveSiteData(SITE_DATA); }
                if (data.products) { STATE.products = data.products; renderProducts(); }
                if (data.promos) { Object.assign(PROMO_CODES, data.promos); localStorage.setItem('price-promo-codes', JSON.stringify(PROMO_CODES)); }
                if (data.contact) { localStorage.setItem('price-contact', JSON.stringify(data.contact)); loadContactInfo().then(i => applyContactInfoToDOM(i)); }
                loadAllSiteSettings();
                renderFlashSale();
                showToast('✅ Données importées !');
            } catch { showToast('Erreur de lecture du fichier'); }
        };
        reader.readAsText(file);
    };
    input.click();
};



// ==========================================
// CORRECTION SVGs DYNAMIQUES (Lucide)
// ==========================================
let isUpdatingIcons = false;
const svgObserver = new MutationObserver(() => {
    if (isUpdatingIcons || typeof lucide === 'undefined') return;
    isUpdatingIcons = true;
    svgObserver.disconnect(); // On se déconnecte pour éviter la boucle infinie
    
    lucide.createIcons();
    
    // On se reconnecte
    setTimeout(() => {
        svgObserver.observe(document.body, { childList: true, subtree: true });
        isUpdatingIcons = false;
    }, 100);
});
svgObserver.observe(document.body, { childList: true, subtree: true });
