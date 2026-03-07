import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import savedRoutes from './routes/saved.js';
import aiRoutes from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───
const allowedOrigins = [
    'https://healthy-kutta-ui.vercel.app',
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
    console.log(`🚀 Healthy Kutta Backend running on http://localhost:${PORT}`);
});
