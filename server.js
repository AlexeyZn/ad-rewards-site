const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Generate a random referral code
const generateReferralCode = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// API: Register
app.post('/api/auth/register', async (req, res) => {
    const { username, password, referred_by } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        let referralCode = generateReferralCode();

        // Simple distinct check could be added here, assuming no collision for now

        db.run('INSERT INTO users (username, password_hash, referral_code, referred_by) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, referralCode, referred_by || null],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ error: 'Username already exists' });
                    }
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }

                // If referred_by is present, we could optionally reward the referrer immediately, 
                // but let's just save it to the DB.

                res.status(201).json({ message: 'User registered successfully' });
            }
        );
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// API: Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Logged in successfully', token });
    });
});

// API: Get User Dashboard Stats
app.get('/api/user/dashboard', authenticateToken, (req, res) => {
    db.get('SELECT username, referral_code, balance, total_ads_viewed FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(row);
    });
});

// API: Record Ad View
app.post('/api/ads/view', authenticateToken, (req, res) => {
    db.get('SELECT total_ads_viewed, balance, referred_by FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const newTotalAds = user.total_ads_viewed + 1;
        let balanceIncrease = 0;

        // Every 5 ads = 200 Naira
        if (newTotalAds % 5 === 0) {
            balanceIncrease = 200;
            // Reward referrer if applicable? The prompt says "also if they refer people money is also added to their dashboard".
            // Let's add 50 Naira to the referrer's dashboard for every 5 ads their referral views (or just a one time bonus).
            // For now, let's keep it simple: just checking the user's earnings. We can add a one-time referral bonus later or per 5 ads.

            if (user.referred_by) {
                db.run('UPDATE users SET balance = balance + ? WHERE referral_code = ?', [50, user.referred_by]);
            }
        }

        db.run('UPDATE users SET total_ads_viewed = ?, balance = balance + ? WHERE id = ?',
            [newTotalAds, balanceIncrease, req.user.id],
            function (updateErr) {
                if (updateErr) return res.status(500).json({ error: 'Database error' });

                res.json({
                    message: 'Ad view recorded',
                    total_ads_viewed: newTotalAds,
                    balance_added: balanceIncrease
                });
            }
        );
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
