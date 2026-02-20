import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import serversRouter from './routes/servers.js';
import channelsRouter from './routes/channels.js';
import messagesRouter from './routes/messages.js';
import moderationRouter from './routes/moderation.js';
import mediaRouter from './routes/media.js';
import vanityRouter from './routes/vanity.js';
import voiceRouter from './routes/voice.js';
import musicRouter from './routes/music.js';
import reportsRouter from './routes/reports.js';
import mutesRouter from './routes/mutes.js';
import automodRouter from './routes/automod.js';
import adminRouter from './routes/admin.js';
import { initGateway } from './websocket/gateway.js';
import pool from './config/database.js';

const app = express();
const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
initGateway(wss);

app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false });
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.get('/health', async (req, res) => {
  let db = 'ok';
  try { await pool.query('SELECT 1'); } catch { db = 'degraded'; }
  res.json({ status: 'ok', db, timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/servers', serversRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/moderation', moderationRouter);
app.use('/api/media', mediaRouter);
app.use('/api/vanity', vanityRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/music', musicRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/mutes', mutesRouter);
app.use('/api/automod', automodRouter);
app.use('/api/admin', adminRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
export default app;
