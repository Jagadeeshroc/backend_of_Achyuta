const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware setup (MUST come before routes)
app.use(cors())
app.use(express.json()); 
 // Parse JSON bodies

const dbPath = path.join(__dirname, 'userInfo.db');
let db = null;

// Initialize Database
const initDB = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });
        console.log('Connected to SQLite database.');
        
        await db.run(`DROP TABLE IF EXISTS users`);
        await db.run(`CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            
            password TEXT NOT NULL
           
        )`);
    } catch (error) {
        console.error('Database Error:', error.message);
    }
};

// User Registration Endpoint (changed to POST)
app.post('/user', async (req, res) => {
    const { username,  password} = req.body;
    
    try {
        // Validate required fields
        if (!username  || !password) {
            return res.status(400).send('Username, name and password are required');
        }

        // Check if user exists
        const selectUserQuery = `SELECT * FROM users WHERE username = ?`;
        const dbUser = await db.get(selectUserQuery, [username]);
        
        if (dbUser) {
            return res.status(400).send('User already exists');
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
       
        const insertQuery = `
        INSERT INTO users 
        (username, password)
        VALUES (?, ?)
    `;
        const dbResponse = await db.run(
            insertQuery,
            [username, hashedPassword]
        );
        
        res.status(201).json({
            message: 'User created successfully',
            userId: dbResponse.lastID
        });
        
    } catch (error) {
        console.error('Registration Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



// Get Single User Endpoint - Fixed Version
app.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID is a number
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const user = await db.get(
            `SELECT 
                id, 
                username, 
                password
            FROM users 
            WHERE id = ?`,
            [id]
        );
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Get User Error:', {
            message: error.message,
            stack: error.stack,
            query: `SELECT id, username, name, gender, location FROM users WHERE id = ${req.params.id}`
        });
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: 'Failed to retrieve user data'
        });
    }
});
// Get All Users Endpoint - Fixed Version
app.get('/users', async (req, res) => {
    try {
        const users = await db.all(
            `SELECT 
                id, 
                username, 
                password
            FROM users `
        );
        res.json(users);
    } catch (error) {
        console.error('Get All Users Error:', {
            message: error.message,
            stack: error.stack,
            query: 'SELECT id, username, name, gender, location FROM users'
        });
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: 'Failed to retrieve users list'
        });
    }
});
// Start Server
app.listen(5000, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Initialize database
initDB();


