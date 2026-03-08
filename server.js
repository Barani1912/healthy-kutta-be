import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import savedRoutes from './routes/saved.js';
import aiRoutes from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust the first proxy (required for Render / any reverse-proxy host)
// Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1);

// ─── Middleware ───
const allowedOrigins = [
    'http://localhost:3000',
    process.env.SITE_URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// ─── Routes ───
app.use('/auth', authRoutes);
app.use('/saved', savedRoutes);
app.use('/ai', aiRoutes);

// ─── Health check ───
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start ───
app.listen(PORT, () => {
    console.log(`🚀 Healthy Kutta Backend running`);
});
