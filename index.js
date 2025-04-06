const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Add this authentication middleware at the top
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Authorization header missing' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token missing' });
        }

        // In a real app, verify JWT here
        // For now, we'll just check if user exists
        const user = await db.get('SELECT * FROM users WHERE id = ?', [token]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

// Middleware setup
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
        
        // Check if users table exists
        const usersTableCheck = await db.get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        );
        
        if (!usersTableCheck) {
            await db.run(`CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            console.log('Created users table');
        }
        
        // Check if jobs table exists
        const jobsTableCheck = await db.get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'"
        );
        
        if (!jobsTableCheck) {
            await db.run(`CREATE TABLE jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    company TEXT NOT NULL,
                    location TEXT,
                    description TEXT,
                    requirements TEXT,
                    salary TEXT,  // Make sure this line exists
                    posted_by INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(posted_by) REFERENCES users(id)
                )`);
            console.log('Created jobs table');
                    }

                    const reviewsTableCheck = await db.get(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'"
                    );
                    // Check if reviews table exists++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
                    if (!reviewsTableCheck) {
                        await db.run(`CREATE TABLE reviews (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            content TEXT NOT NULL,
                            rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                            job_id INTEGER NOT NULL,
                            user_id INTEGER NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE,
                            FOREIGN KEY(user_id) REFERENCES users(id)
                        )`);
                        console.log('Created reviews table');
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

// Create a new job posting
app.post('/jobs', async (req, res) => {
    const { title, company, location, description, requirements,salary, posted_by } = req.body;
    
    if (!title || !company || !posted_by) {
        return res.status(400).json({ error: 'Title, company, and poster ID are required' });
    }

    try {
        // Verify the user exists
        const user = await db.get('SELECT id FROM users WHERE id = ?', [posted_by]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const result = await db.run(
            `INSERT INTO jobs 
            (title, company, location, description, requirements,salary, posted_by) 
            VALUES (?, ?, ?, ?, ?, ?,? )`,
            [title, company, location, description, requirements,salary, posted_by]
        );

        res.status(201).json({
            success: true,
            message: 'Job posted successfully',
            jobId: result.lastID
        });
    } catch (error) {
        console.error('Job Post Error:', error);
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: error.message
        });
    }
});

// Get all jobs
app.get('/jobs', async (req, res) => {
    try {
        const jobs = await db.all(`
            SELECT 
                j.id,
                j.title,
                j.company,
                j.location,
                j.description,
                j.requirements,
                j.salary,
                j.created_at,
                u.username as posted_by_username,
                u.id as posted_by_id
            FROM jobs j
            JOIN users u ON j.posted_by = u.id
            ORDER BY j.created_at DESC
        `);
        res.json(jobs);
    } catch (error) {
        console.error('Get Jobs Error:', error);
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: error.message
        });
    }
});

// Get a single job by ID
app.get('/jobs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const job = await db.get(`
             SELECT 
                j.id,
                j.title,
                j.company,
                j.location,
                j.description,
                j.requirements,
                j.salary,
                j.created_at,
                u.username as posted_by_username,
                u.id as posted_by_id
            FROM jobs j
            JOIN users u ON j.posted_by = u.id
            WHERE j.id = ?
        `, [id]);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json(job);
    } catch (error) {
        console.error('Get Job Error:', error);
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: error.message
        });
    }
});

// Update a job posting
app.put('/jobs/:id', async (req, res) => {
    const { id } = req.params;
    const { title, company, location, description, requirements, salary } = req.body;
    
    if (!title || !company) {
        return res.status(400).json({ error: 'Title and company are required' });
    }

    try {
        const result = await db.run(
            `UPDATE jobs 
            SET title = ?, company = ?, location = ?, description = ?, requirements = ?, salary = ?
            WHERE id = ?`,
            [title, company, location, description, requirements, salary, id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({ success: true, message: 'Job updated successfully' });
    } catch (error) {
        console.error('Update Job Error:', error);
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: error.message
        });
    }
});

// Delete a job posting
app.delete('/jobs/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.run('DELETE FROM jobs WHERE id = ?', [id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({ success: true, message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Delete Job Error:', error);
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: error.message
        });
    }
});

// Get jobs posted by a specific user
app.get('/users/:userId/jobs', async (req, res) => {
    const { userId } = req.params;

    try {
        const jobs = await db.all(`
            SELECT 
                j.id,
                j.title,
                j.company,
                j.location,
                j.description,
                j.requirements,
                j.salary,
                j.created_at,
                u.username as posted_by_username
            FROM jobs j
            JOIN users u ON j.posted_by = u.id
            WHERE j.posted_by = ? 
            ORDER BY j.created_at DESC
        `, [userId]);
        
        res.json(jobs);
    } catch (error) {
        console.error('Get User Jobs Error:', error);
        res.status(500).json({ 
            error: 'Internal Server Error',
            details: error.message
        });
    }
});



// In your server.js, modify the reviews endpoint to add better error logging:
app.post('/jobs/:id/reviews', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { content, rating } = req.body;
        const user_id = req.user.id; // Get from authenticated user
        
        console.log(`Adding review to job ${id} by user ${user_id}`); // Debug log

        // Validation
        if (!content || !rating) {
            return res.status(400).json({ error: 'Content and rating are required' });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        if (content.length < 10) {
            return res.status(400).json({ error: 'Review must be at least 10 characters' });
        }

        // Verify job exists
        const job = await db.get('SELECT id FROM jobs WHERE id = ?', [id]);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Insert review
        const result = await db.run(
            `INSERT INTO reviews (content, rating, job_id, user_id)
             VALUES (?, ?, ?, ?)`,
            [content, rating, id, user_id]
        );

        // Get the full review with user details
        const newReview = await db.get(`
            SELECT 
                r.id,
                r.content,
                r.rating,
                r.created_at,
                u.username as user_name,
                u.id as user_id
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        `, [result.lastID]);

        console.log('Successfully added review:', newReview); // Debug log
        res.status(201).json(newReview);
    } catch (error) {
        console.error('Detailed Add Review Error:', {
            message: error.message,
            stack: error.stack,
            params: req.params,
            body: req.body
        });
        res.status(500).json({ 
            error: 'Failed to add review',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update the reviews GET endpoint
app.get('/jobs/:id/reviews', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Fetching reviews for job ID: ${id}`);
        
        // First verify job exists
        const jobExists = await db.get('SELECT id FROM jobs WHERE id = ?', [id]);
        if (!jobExists) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const reviews = await db.all(`
            SELECT 
                r.id,
                r.content,
                r.rating,
                r.created_at,
                u.username as user_name,
                u.id as user_id
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.job_id = ?
            ORDER BY r.created_at DESC
        `, [id]);

        console.log(`Found ${reviews.length} reviews for job ${id}`);
        res.json(reviews);
    } catch (error) {
        console.error('Detailed Get Reviews Error:', {
            message: error.message,
            stack: error.stack,
            params: req.params
        });
        res.status(500).json({ 
            error: 'Failed to fetch reviews',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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