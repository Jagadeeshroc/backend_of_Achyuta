// server/routes/users.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');

router.get('/', (req, res) => {
    const users = db.prepare('SELECT id, username, email, created_at FROM users').all();
    res.json(users);
});

router.get('/:id', (req, res) => {
    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

router.get('/:userId/jobs', (req, res) => {
    const jobs = db.prepare(`
        SELECT * FROM jobs WHERE posted_by = ? ORDER BY created_at DESC
    `).all(req.params.userId);
    res.json(jobs);
});

module.exports = router;