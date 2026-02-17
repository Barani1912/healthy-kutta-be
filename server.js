import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import savedRoutes from './routes/saved.js';
import aiRoutes from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// ─── Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/ai', aiRoutes);

// ─── Health check ───
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start ───
app.listen(PORT, () => {
    console.log(`🚀 Healthy Kutta Backend running on http://localhost:${PORT}`);
});
