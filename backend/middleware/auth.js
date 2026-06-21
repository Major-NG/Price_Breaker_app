const jwt = require('jsonwebtoken');

const SECRET_KEY = 'PRICE_BREAKER_SUPER_SECRET_KEY_DEV'; // À mettre dans un fichier .env plus tard

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token invalide ou expiré.' });
        }
        req.user = user;
        next();
    });
}

function isAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Accès refusé. Privilèges administrateur requis.' });
    }
}

module.exports = {
    authenticateToken,
    isAdmin,
    SECRET_KEY
};
