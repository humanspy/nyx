require('dotenv').config();
const express = require('express');
const db = require('./db');
const authRouter = require('./auth');
const moderationRouter = require('./moderation');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/auth', authRouter);
app.use('/api', moderationRouter);

// Simple route for testing
app.get('/', (req, res) => {
  res.send('API Server is running!');
});

// Example route to test database connection
app.get('/test-db', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT NOW()');
    res.json({ now: rows[0].now, message: 'Database connection successful.' });
  } catch (err) {
    console.error('Database connection error', err);
    res.status(500).json({ message: 'Database connection failed.' });
  }
});


app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
