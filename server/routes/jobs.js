// server/routes/jobs.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, (req, res) => {
    const { title, company, location, description, requirements, salary } = req.body;
    const userId = req.user.id;

    if (!title || !company) return res.status(400).json({ error: 'Title and company are required' });

    const result = db.prepare(`
        INSERT INTO jobs (title, company, location, description, requirements, salary, posted_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, company, location, description, requirements, salary, userId);

    res.status(201).json({ success: true, jobId: result.lastInsertRowid });
});

router.get('/', (req, res) => {
    const jobs = db.prepare(`
        SELECT j.*, u.username as posted_by_username 
        FROM jobs j JOIN users u ON j.posted_by = u.id 
        ORDER BY j.created_at DESC
    `).all();
    res.json(jobs);
});

router.get('/:id', (req, res) => {
    const job = db.prepare(`
        SELECT j.*, u.username as posted_by_username 
        FROM jobs j JOIN users u ON j.posted_by = u.id WHERE j.id = ?
    `).get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
});

router.put('/:id', authenticate, (req, res) => {
    const { title, company, location, description, requirements, salary } = req.body;
    const { id } = req.params;

    const result = db.prepare(`
        UPDATE jobs SET title = ?, company = ?, location = ?, description = ?, requirements = ?, salary = ? 
        WHERE id = ?
    `).run(title, company, location, description, requirements, salary, id);

    if (result.changes === 0) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true, message: 'Job updated successfully' });
});

router.delete('/:id', authenticate, (req, res) => {
    const result = db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true, message: 'Job deleted' });
});

module.exports = router;