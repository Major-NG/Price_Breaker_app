const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erreur lors de la connexion à la base de données SQLite', err.message);
    } else {
        console.log('Connecté à la base de données SQLite.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Table des utilisateurs
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            mot_de_passe TEXT NOT NULL,
            role TEXT DEFAULT 'client'
        )`);

        // Table des produits
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            image_url TEXT,
            prix_public REAL NOT NULL,
            prix_partenaire REAL,
            categorie TEXT,
            stock INTEGER DEFAULT 100,
            allow_discount BOOLEAN DEFAULT 1
        )`);

        // Table des commandes
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            total REAL NOT NULL,
            status TEXT DEFAULT 'en attente',
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Table des paramètres
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

        // Création d'un admin par défaut si la table est vide
        db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'", async (err, row) => {
            if (row.count === 0) {
                const hashedPassword = await bcrypt.hash('12345678', 10);
                db.run(`INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)`, 
                    ['Administrateur', 'admin@pricebreaker.com', hashedPassword, 'admin'], 
                    (err) => {
                        if (err) console.error("Erreur création admin", err);
                        else console.log("Administrateur par défaut créé (admin@pricebreaker.com / 12345678)");
                    });
            }
        });

        // Insertion des produits par défaut si la table est vide
        db.get("SELECT COUNT(*) AS count FROM products", (err, row) => {
            if (row.count === 0) {
                const stmt = db.prepare(`INSERT INTO products (nom, image_url, prix_public, prix_partenaire, categorie) VALUES (?, ?, ?, ?, ?)`);
                const defaultProducts = [
                    ['Air pods SAMSUNG', 'assets/Air pods SAMSUNG.jpg', 5000, 4000, '🎧 Audio & Son'],
                    ['Airpods Oraimo', 'assets/Airpods Oraimo.jpg', 5000, 4000, '⭐️ Meilleures Ventes'],
                    ['Casque BS', 'assets/Casque BS.jpg', 5000, 4000, '🎧 Audio & Son'],
                    ['Casque JBL', 'assets/Casque JBL.jpg', 6000, 5000, '🔥 Promotions'],
                    ['Cordon Trois tête', 'assets/Cordon Trois tête.jpg', 1500, 1000, '🔌 Accessoires & Câblage'],
                    ['Disque-dur externe SSD 512Go', 'assets/Disque-dur externe SSD.jpg', 35000, 27000, '🔥 Promotions'],
                    ['Ecouteur OPPO', 'assets/Ecouteur OPPO.jpg', 1000, 500, '🎧 Audio & Son'],
                    ['Mannette PS4', 'assets/Mannette PS4.jpg', 8000, 7000, '✨ Nouveautés'],
                    ['Negless JBL', 'assets/Negless JBL.jpg', 6000, 5000, '✨ Nouveautés'],
                    ['Power banck HOCO 30 000mAh', 'assets/Power banck HOCO.jpeg', 10000, 9000, '⭐️ Meilleures Ventes'],
                    ['Ralonge 4 troues', 'assets/Ralonge 4 troues.jpg', 2000, 1500, '🔌 Accessoires & Câblage'],
                    ['Sourie filaire HP', 'assets/Sourie filaire HP.jpg', 2000, 1500, '🔌 Accessoires & Câblage']
                ];
                defaultProducts.forEach(p => stmt.run(p));
                stmt.finalize();
                console.log("Produits par défaut insérés dans la base de données.");
            }
        });
    });
}

module.exports = db;
