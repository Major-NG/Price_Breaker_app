const path = require('path');
const bcrypt = require('bcrypt');

const isProd = !!process.env.DATABASE_URL;

let dbWrapper = {};

if (isProd) {
    const { Pool } = require('pg');
    console.log('Connexion à la base de données PostgreSQL...');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    const formatQuery = (sql) => {
        let i = 1;
        // Traduction SQLite vers PostgreSQL
        let pgSql = sql.replace(/AUTOINCREMENT/ig, 'SERIAL');
        pgSql = pgSql.replace(/REAL/ig, 'FLOAT');
        pgSql = pgSql.replace(/DATETIME/ig, 'TIMESTAMP');
        return pgSql.replace(/\?/g, () => `$${i++}`);
    };

    dbWrapper = {
        run: function(sql, params = [], callback) {
            if (typeof params === 'function') { callback = params; params = []; }
            const isInsert = sql.toUpperCase().includes('INSERT INTO');
            let finalSql = formatQuery(sql);
            if (isInsert && !finalSql.toUpperCase().includes('RETURNING ID')) {
                finalSql += ' RETURNING id';
            }
            
            pool.query(finalSql, params, (err, result) => {
                const mockThis = {};
                if (!err && isInsert && result && result.rows && result.rows.length > 0) {
                    mockThis.lastID = result.rows[0].id;
                }
                if (callback) callback.call(mockThis, err);
            });
        },
        get: function(sql, params = [], callback) {
            if (typeof params === 'function') { callback = params; params = []; }
            pool.query(formatQuery(sql), params, (err, result) => {
                if (err) return callback(err);
                callback(null, result.rows[0]);
            });
        },
        all: function(sql, params = [], callback) {
            if (typeof params === 'function') { callback = params; params = []; }
            pool.query(formatQuery(sql), params, (err, result) => {
                if (err) return callback(err);
                callback(null, result.rows);
            });
        },
        serialize: function(cb) { cb(); } // Mock de serialize
    };

    // Initialisation asynchrone pour PostgreSQL
    const initPg = async () => {
        try {
            await pool.query(formatQuery(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                mot_de_passe TEXT NOT NULL,
                role TEXT DEFAULT 'client'
            )`));
            
            await pool.query(formatQuery(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL,
                image_url TEXT,
                prix_public REAL NOT NULL,
                prix_partenaire REAL,
                categorie TEXT,
                stock INTEGER DEFAULT 100,
                allow_discount BOOLEAN DEFAULT true
            )`));

            await pool.query(formatQuery(`CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                total REAL NOT NULL,
                status TEXT DEFAULT 'en attente',
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`));

            await pool.query(formatQuery(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`));

            const resUsers = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
            if (parseInt(resUsers.rows[0].count) === 0) {
                const hashedPassword = await bcrypt.hash('12345678', 10);
                await pool.query(formatQuery(`INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)`), 
                    ['Administrateur', 'admin@pricebreaker.com', hashedPassword, 'admin']);
                console.log("Administrateur par défaut créé");
            }

            const resProducts = await pool.query("SELECT COUNT(*) AS count FROM products");
            if (parseInt(resProducts.rows[0].count) === 0) {
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
                for (const p of defaultProducts) {
                    await pool.query(formatQuery(`INSERT INTO products (nom, image_url, prix_public, prix_partenaire, categorie) VALUES (?, ?, ?, ?, ?)`), p);
                }
                console.log("Produits par défaut insérés dans PostgreSQL.");
            }
        } catch (e) {
            console.error("Erreur init PostgreSQL", e);
        }
    };
    initPg();

} else {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, 'database.sqlite');
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Erreur connexion SQLite', err.message);
        } else {
            console.log('Connecté à la base de données SQLite.');
            initializeDatabase();
        }
    });

    dbWrapper = db;

    function initializeDatabase() {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                mot_de_passe TEXT NOT NULL,
                role TEXT DEFAULT 'client'
            )`);
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
            db.run(`CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                total REAL NOT NULL,
                status TEXT DEFAULT 'en attente',
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`);
            
            db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'", async (err, row) => {
                if (row.count === 0) {
                    const hashedPassword = await bcrypt.hash('12345678', 10);
                    db.run(`INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)`, 
                        ['Administrateur', 'admin@pricebreaker.com', hashedPassword, 'admin'], 
                        (err) => {
                            if (err) console.error("Erreur création admin", err);
                            else console.log("Administrateur par défaut créé");
                        });
                }
            });
            
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
                    console.log("Produits par défaut insérés.");
                }
            });
        });
    }
}

module.exports = dbWrapper;
