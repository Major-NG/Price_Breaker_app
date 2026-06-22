const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const os = require('os');

// Configuration locale de multer (utilise le dossier temporaire du système)
const upload = multer({ dest: os.tmpdir() });
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');
const { authenticateToken, isAdmin, SECRET_KEY } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// ROUTES AUTHENTIFICATION & UPLOAD
// ==========================================

// Upload d'image vers Cloudinary (Admin uniquement)
app.post('/api/upload', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Aucun fichier fourni." });
        }
        // Cloudinary va détecter automatiquement process.env.CLOUDINARY_URL
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'pricebreaker'
        });
        
        // Supprimer le fichier local temporaire
        fs.unlinkSync(req.file.path);
        
        res.json({ url: result.secure_url });
    } catch (err) {
        console.error("Erreur Cloudinary détaillée:", err);
        // Nettoyage en cas d'erreur
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        
        // Renvoyer le message exact d'erreur pour aider au débogage
        res.status(500).json({ message: "Erreur Cloudinary: " + (err.message || JSON.stringify(err)) });
    }
});
// ==========================================

// Inscription
app.post('/api/auth/register', async (req, res) => {
    const { nom, email, mot_de_passe, role } = req.body;
    
    if (!nom || !email || !mot_de_passe) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
        // On s'assure qu'un utilisateur normal ne peut pas s'inscrire en tant qu'admin
        const safeRole = (role === 'partenaire') ? 'partenaire' : 'client';

        db.run(`INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)`, 
            [nom, email, hashedPassword, safeRole], 
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed') || err.message.toLowerCase().includes('unique constraint')) {
                        return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
                    }
                    return res.status(500).json({ message: 'Erreur lors de l\'inscription.' });
                }
                res.status(201).json({ message: 'Inscription réussie.', userId: this.lastID });
            }
        );
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// Connexion
app.post('/api/auth/login', (req, res) => {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
        return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur.' });
        if (!user) return res.status(401).json({ message: 'Identifiants incorrects.' });

        const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
        if (!isMatch) return res.status(401).json({ message: 'Identifiants incorrects.' });

        // Création du Token
        const token = jwt.sign(
            { id: user.id, role: user.role, nom: user.nom }, 
            SECRET_KEY, 
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Connexion réussie',
            token,
            role: user.role,
            nom: user.nom
        });
    });
});

// ==========================================
// ROUTES PRODUITS
// ==========================================

// Obtenir tous les produits (Public)
app.get('/api/products', (req, res) => {
    db.all(`SELECT * FROM products`, [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur.' });
        res.json(rows);
    });
});

// Ajouter un produit (Admin)
app.post('/api/products', authenticateToken, isAdmin, (req, res) => {
    const { nom, image_url, prix_public, prix_partenaire, categorie, stock, allow_discount } = req.body;

    const s = stock !== undefined ? stock : 100;
    const ad = allow_discount !== undefined ? allow_discount : 1;

    db.run(`INSERT INTO products (nom, image_url, prix_public, prix_partenaire, categorie, stock, allow_discount) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nom, image_url || 'assets/LOGO_Price_Breaker.jpeg', prix_public, prix_partenaire, categorie, s, ad],
        function(err) {
            if (err) return res.status(500).json({ message: 'Erreur lors de l\'ajout du produit.' });
            res.status(201).json({ id: this.lastID, message: 'Produit ajouté avec succès.' });
        }
    );
});

// Modifier un produit (Admin)
app.put('/api/products/:id', authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const { nom, image_url, prix_public, prix_partenaire, categorie, stock, allow_discount } = req.body;

    const s = stock !== undefined ? stock : 100;
    const ad = allow_discount !== undefined ? allow_discount : 1;

    db.run(`UPDATE products SET nom = ?, image_url = ?, prix_public = ?, prix_partenaire = ?, categorie = ?, stock = ?, allow_discount = ? WHERE id = ?`,
        [nom, image_url, prix_public, prix_partenaire, categorie, s, ad, id],
        function(err) {
            if (err) return res.status(500).json({ message: 'Erreur lors de la modification.' });
            if (this.changes === 0) return res.status(404).json({ message: 'Produit non trouvé.' });
            res.json({ message: 'Produit mis à jour avec succès.' });
        }
    );
});

// Supprimer un produit (Admin)
app.delete('/api/products/:id', authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM products WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ message: 'Erreur lors de la suppression.' });
        if (this.changes === 0) return res.status(404).json({ message: 'Produit non trouvé.' });
        res.json({ message: 'Produit supprimé.' });
    });
});

// ==========================================
// ROUTES STATISTIQUES (Admin)
// ==========================================

// Chiffre d'affaires
app.get('/api/stats/revenue', authenticateToken, isAdmin, (req, res) => {
    db.get(`SELECT SUM(total) as revenue FROM orders WHERE status = 'payée'`, [], (err, row) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur.' });
        res.json({ revenue: row.revenue || 0 });
    });
});

// Top produits (simulation basique si pas de liaison produits/orders)
app.get('/api/stats/top-products', authenticateToken, isAdmin, (req, res) => {
    // Pour l'instant, on renvoie une liste fictive car la table order_items n'est pas encore créée
    const mockTop = [
        { nom: 'Air pods SAMSUNG', total_vendu: 42 },
        { nom: 'Casque JBL', total_vendu: 28 },
        { nom: 'Power banck HOCO 30 000mAh', total_vendu: 15 }
    ];
    res.json(mockTop);
});

// ==========================================
// ROUTES PARAMÈTRES (Settings)
// ==========================================

// Récupérer un paramètre public (ex: google_maps_url)
app.get('/api/settings/:key', (req, res) => {
    db.get(`SELECT value FROM settings WHERE key = ?`, [req.params.key], (err, row) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur.' });
        res.json({ value: row ? row.value : null });
    });
});

// Mettre à jour un paramètre (Admin)
app.post('/api/settings/:key', authenticateToken, isAdmin, (req, res) => {
    const { key } = req.params;
    const { value } = req.body;

    db.run(`INSERT INTO settings (key, value) VALUES (?, ?) 
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`, 
        [key, value], 
        function(err) {
            if (err) return res.status(500).json({ message: 'Erreur lors de la sauvegarde.' });
            res.json({ message: 'Paramètre sauvegardé avec succès.' });
        }
    );
});

// ==========================================
// HÉBERGEMENT DU FRONTEND (Pour Render.com)
// ==========================================
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/price.html'));
});

// ==========================================
// DÉMARRAGE DU SERVEUR
// ==========================================
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`API URL: http://localhost:${PORT}/api`);
    console.log(`Frontend URL: http://localhost:${PORT}`);
});
