// server/middleware/auth.js
const { db } = require('../db');

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(token);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    req.user = user;
    next();
};

module.exports = { authenticate };