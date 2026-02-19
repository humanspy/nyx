const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// Registration
router.post('/register', async (req, res) => {
  try {
    const { username, discriminator, password } = req.body;
    if (!username || !discriminator || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      'INSERT INTO users (username, discriminator, password_hash) VALUES ($1, $2, $3) RETURNING id, username',
      [username, discriminator, password_hash]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: newUser.rows[0],
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ message: 'Username is already taken.' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, discriminator, password } = req.body;
    if (!username || !discriminator || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const userResult = await db.query('SELECT * FROM users WHERE username = $1 AND discriminator = $2', [username, discriminator]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const payload = {
      user: {
        id: user.id,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
