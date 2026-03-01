import { supabase } from './supabase.js';

/**
 * Middleware: extract and verify user from Authorization header.
 * Attaches req.user and req.accessToken on success.
 */
export async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    const token = authHeader.split(' ')[1];
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    req.user = data.user;
    req.accessToken = token;
    next();
}
