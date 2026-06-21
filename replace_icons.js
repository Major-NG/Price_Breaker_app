const fs = require('fs');
const path = require('path');

const htmlFile = path.join(__dirname, 'frontend/price.html');
const jsFile = path.join(__dirname, 'frontend/price.js');

let html = fs.readFileSync(htmlFile, 'utf8');
let js = fs.readFileSync(jsFile, 'utf8');

// --- 1. Remplacement des Emojis dans le HTML ---
const htmlReplacements = {
    '📦 Commandes': '<i data-lucide="package" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i> Commandes',
    '🤝 Partenaires': '<i data-lucide="users" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i> Partenaires',
    '❤️': '<i data-lucide="heart" style="width:18px;height:18px;vertical-align:middle;"></i>',
    '🛒': '<i data-lucide="shopping-cart" style="width:18px;height:18px;vertical-align:middle;"></i>',
    '🚀': '<i data-lucide="rocket" style="width:40px;height:40px;vertical-align:middle;"></i>',
    '✅': '<i data-lucide="check-circle" style="width:40px;height:40px;vertical-align:middle;"></i>',
    '🔧': '<i data-lucide="wrench" style="width:40px;height:40px;vertical-align:middle;"></i>',
    '↩️': '<i data-lucide="rotate-ccw" style="width:40px;height:40px;vertical-align:middle;"></i>',
    '⏳ Envoi...': '<i data-lucide="loader" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i> Envoi...',
    '🔒 Accès Administrateur': 'Accès Administrateur' // will be removed anyway
};

for (const [emoji, svg] of Object.entries(htmlReplacements)) {
    html = html.split(emoji).join(svg);
}

// Ajouter le script Lucide Icons dans le HTML juste avant la fin du body
if (!html.includes('lucide@latest')) {
    html = html.replace('</body>', '    <script src="https://unpkg.com/lucide@latest"></script>\n    <script>lucide.createIcons();</script>\n</body>');
}


// --- 2. Remplacement des Emojis dans le JS ---
const jsReplacements = {
    '✏️': '<i data-lucide="edit" style="width:16px;height:16px;"></i>',
    '🗑️': '<i data-lucide="trash-2" style="width:16px;height:16px;"></i>',
    '➕ Produit': '<i data-lucide="plus-circle" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i> Produit',
    '📞': '<i data-lucide="phone" style="width:16px;height:16px;vertical-align:middle;"></i>',
    '✉️': '<i data-lucide="mail" style="width:16px;height:16px;vertical-align:middle;"></i>',
    '⭐️': '<i data-lucide="star" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>',
    '🎧': '<i data-lucide="headphones" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>',
    '🔥': '<i data-lucide="flame" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>',
    '🔌': '<i data-lucide="plug" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>',
    '✨': '<i data-lucide="sparkles" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i>'
};

for (const [emoji, svg] of Object.entries(jsReplacements)) {
    js = js.split(emoji).join(svg);
}

// Make sure lucide.createIcons() is called at the end of render functions
const renderFunctions = ['function renderProducts() {', 'function renderAdminDashboard() {', 'function renderFlashSale() {'];
for (const fn of renderFunctions) {
    if (js.includes(fn)) {
        // Find the end of the function and insert lucide.createIcons();
        // Since it's hard to find the end via regex perfectly, we can just replace 'if (typeof lucide !== "undefined") lucide.createIcons();' 
        // inside the main render loop, or just globally add it to UI updates.
        // Let's use a simpler approach: replace DOM updates with DOM updates + lucide
    }
}

// Replace innerHTML assignments with innerHTML + lucide
js = js.replace(/productGrid\.innerHTML = '(.*?)';/g, 'productGrid.innerHTML = \'$1\';\n    if (typeof lucide !== "undefined") lucide.createIcons();');
js = js.replace(/flashSaleGrid\.innerHTML = '(.*?)';/g, 'flashSaleGrid.innerHTML = \'$1\';\n    if (typeof lucide !== "undefined") lucide.createIcons();');
js = js.replace(/adminProductList\.innerHTML = '';/g, 'adminProductList.innerHTML = \'\';\n    if (typeof lucide !== "undefined") lucide.createIcons();');

// Also inject lucide call after appendChild loops finish in renderProducts and renderAdminDashboard
js = js.replace(/productGrid\.appendChild\(card\);\n        }\);/g, 'productGrid.appendChild(card);\n        });\n        if (typeof lucide !== "undefined") lucide.createIcons();');
js = js.replace(/adminProductList\.appendChild\(li\);\n        }\);/g, 'adminProductList.appendChild(li);\n        });\n        if (typeof lucide !== "undefined") lucide.createIcons();');

// --- 3. Suppression du mode Admin (btnSwitchAdmin) ---
// Remove btnSwitchAdmin references completely
js = js.replace(/const btnSwitchAdmin = document\.getElementById\('btn-switch-admin'\);/g, '');
js = js.replace(/if \(btnSwitchAdmin\) {[\s\S]*?}\n/g, '');
js = js.replace(/btnSwitchAdmin\.classList\.(add|remove)\('hidden'\);/g, '');
js = js.replace(/btnSwitchAdmin\.textContent = '.*?';/g, '');

html = html.replace(/<button type="button" id="btn-switch-admin" class="btn-switch-admin">.*?<\/button>/g, '');

fs.writeFileSync(htmlFile, html);
fs.writeFileSync(jsFile, js);
console.log("Remplacement terminé !");
