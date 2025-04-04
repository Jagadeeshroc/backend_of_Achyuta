const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware setup
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

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
        
        // Check if table exists first
        const tableCheck = await db.get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        );
        
        if (!tableCheck) {
            // Create new table only if it doesn't exist
            await db.run(`CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            console.log('Created users table');
        } else {
            console.log('Users table already exists');
        }
        
    } catch (error) {
        console.error('Database Error:', error.message);
        process.exit(1);
    }
};

// Helper function for input validation

const validateInput = (username, email, password) => {
    const errors = [];
    
    if (!username || !email || !password) {
        errors.push('All fields are required');
    }
    
    if (username && (username.length < 4 || username.length > 20)) {
        errors.push('Username must be 4-20 characters');
    }
    
    if (password && password.length < 4) {
        errors.push('Password must be at least 8 characters');
    }
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Invalid email format');
    }
    
    return errors;
};

// Registration Endpoint


app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;
    
    // Validate input
    const validationErrors = validateInput(username, email, password);
    if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
    }

    try {
        // Check if user exists by username or email
        const selectUserQuery = `SELECT * FROM users WHERE username = ? OR email = ?`;
        const dbUser = await db.get(selectUserQuery, [username, email]);
        
        if (dbUser) {
            const errors = [];
            if (dbUser.username === username) errors.push('Username already exists');
            if (dbUser.email === email) errors.push('Email already registered');
            return res.status(400).json({ errors });
        }
        
        // Hash password
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert new user
        const insertQuery = `
            INSERT 
            INTO 
            users
             (username, password, email)
            VALUES (?, ?, ?)`;
        
        const dbResponse = await db.run(insertQuery, [username, hashedPassword, email]);
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: dbResponse.lastID
        });
        
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Login Endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Validate input
        if (!username || !password){
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Check if user exists
        const user = await db.get(
            `SELECT * FROM users WHERE username = ?`,
            [username]
        );
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Compare passwords
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Successful login response
        res.status(200).json({
            success: true,
            message: 'Login successful',
            userId: user.id,
            username: user.username
        });
        
    } catch (error) {
        console.error('Login Error:', error.message);
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: error.message 
        });
    }
});

// User Endpoints
app.get('/users/:id', async (req, res) =>{
    try {
        const { id } = req.params;
        
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const user = await db.get(
            `SELECT id, username, email, created_at,password FROM users WHERE id = ?`,
            [id]
        );
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Get User Error:', error.message);
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: 'Failed to retrieve user data'
        });
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await db.all(
            `SELECT id, username, email, created_at,password FROM users`
        );
        res.json(users);
    } catch (error) {
        console.error('Get All Users Error:', error.message);
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: 'Failed to retrieve users list'
        });
    }
});

// Start Server


app.listen(PORT, async () => {
    try {
        await initDB();
        console.log(`Server running on http://localhost:${PORT}`);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
    
});