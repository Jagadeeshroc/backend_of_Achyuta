// server/routes/reviews.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');

router.post('/jobs/:jobId/reviews', authenticate, (req, res) => {
    const { content, rating } = req.body;
    const { jobId } = req.params;
    const userId = req.user.id;

    if (!content || !rating) return res.status(400).json({ error: 'Content and rating required' });

    const result = db.prepare(`
        INSERT INTO reviews (content, rating, job_id, user_id) VALUES (?, ?, ?, ?)
    `).run(content, rating, jobId, userId);

    res.status(201).json({ success: true, reviewId: result.lastInsertRowid });
});

router.get('/jobs/:jobId/reviews', (req, res) => {
    const { jobId } = req.params;
    const reviews = db.prepare(`
        SELECT r.*, u.username as user_username FROM reviews r 
        JOIN users u ON r.user_id = u.id WHERE job_id = ? ORDER BY r.created_at DESC
    `).all(jobId);
    res.json({ success: true, reviews });
});

module.exports = router;