import { supabase } from '../lib/supabase.js';

/**
 * Middleware to require authentication.
 * Checks for access_token in cookies or Authorization header.
 * Attaches user to req.user if valid.
 */
export async function requireAuth(req, res, next) {
    try {
        let token = req.cookies?.access_token;

        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ error: 'Authentication required. No token provided.' });
        }

        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            // Clear invalid cookie
            res.clearCookie('access_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'none'
            });
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }

        req.user = data.user;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ error: 'Failed to authenticate request.' });
    }
}
