// server/db.js
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'userInfo.db'));

// Initialize database tables
const initDB = () => {
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        company TEXT,
        location TEXT,
        description TEXT,
        requirements TEXT,
        salary TEXT,
        posted_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(posted_by) REFERENCES users(id)
    )`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        job_id INTEGER,
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(job_id) REFERENCES jobs(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`).run();
};

module.exports = { db, initDB };