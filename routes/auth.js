import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { supabase, createUserClient } from '../lib/supabase.js';
import { sanitizeEmail, sanitizeName, sanitizeString, validatePasswordStrength } from '../lib/sanitize.js';

const router = Router();

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

// ─── Rate Limiters ───

const signupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // Increased for development/testing
    message: { error: 'Too many signup attempts from this IP. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: { error: 'Too many password reset requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * POST /api/auth/signup
 * Body: { name, email, password }
 */
router.post('/signup', signupLimiter, async (req, res) => {
    try {
        const rawName = req.body.name;
        const rawEmail = req.body.email;
        const rawPassword = req.body.password;

        // Sanitize name
        const name = sanitizeName(rawName);
        if (!name || name.length < 2) {
            return res.status(400).json({ error: 'Name must be at least 2 characters (letters only).' });
        }

        // Sanitize and validate email
        const { valid: emailValid, email } = sanitizeEmail(rawEmail);
        if (!emailValid) {
            return res.status(400).json({ error: 'Please provide a valid email address.' });
        }

        // Validate password strength
        const { valid: pwValid, errors: pwErrors } = validatePasswordStrength(rawPassword);
        if (!pwValid) {
            return res.status(400).json({ error: pwErrors[0], errors: pwErrors });
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password: rawPassword,
            options: {
                data: { full_name: name },
                emailRedirectTo: SITE_URL,
            },
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Supabase may return a session if email confirmation is disabled,
        // but we enforce confirmation — so only return a success message.
        res.json({
            message: 'Account created! Please check your email to confirm your account before logging in.',
            user: {
                id: data.user?.id,
                email: data.user?.email,
                name: name,
            },
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Signup failed. Please try again.' });
    }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const rawEmail = req.body.email;
        const rawPassword = req.body.password;

        // Sanitize email
        const { valid: emailValid, email } = sanitizeEmail(rawEmail);
        if (!emailValid) {
            return res.status(400).json({ error: 'Please provide a valid email address.' });
        }

        if (!rawPassword) {
            return res.status(400).json({ error: 'Password is required.' });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: rawPassword,
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Check if email is confirmed
        if (!data.user?.email_confirmed_at) {
            return res.status(403).json({
                error: 'Please verify your email before logging in. Check your inbox for the confirmation link.',
            });
        }

        const fullName = data.user?.user_metadata?.full_name || '';

        res.json({
            user: {
                id: data.user?.id,
                email: data.user?.email,
                name: fullName,
            },
            session: {
                access_token: data.session?.access_token,
                refresh_token: data.session?.refresh_token,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 */
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
    try {
        const rawEmail = req.body.email;
        const { valid: emailValid, email } = sanitizeEmail(rawEmail);

        if (!emailValid) {
            return res.status(400).json({ error: 'Please provide a valid email address.' });
        }

        // Always return success to not reveal if email exists
        await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${SITE_URL}/reset-password`,
        });

        res.json({
            message: 'If an account with that email exists, you will receive a password reset link shortly.',
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        // Still return success to not reveal information
        res.json({
            message: 'If an account with that email exists, you will receive a password reset link shortly.',
        });
    }
});

/**
 * POST /api/auth/reset-password
 * Body: { access_token, new_password }
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { access_token, new_password } = req.body;

        if (!access_token) {
            return res.status(400).json({ error: 'Reset token is required.' });
        }

        // Validate new password strength
        const { valid: pwValid, errors: pwErrors } = validatePasswordStrength(new_password);
        if (!pwValid) {
            return res.status(400).json({ error: pwErrors[0], errors: pwErrors });
        }

        // Create a user-scoped client with the reset token
        const userClient = createUserClient(access_token);
        const { data, error } = await userClient.auth.updateUser({
            password: new_password,
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Failed to reset password. Please try again.' });
    }
});

/**
 * POST /api/auth/logout
 * Headers: Authorization: Bearer <token>
 */
router.post('/logout', async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        res.json({ message: 'Logged out successfully.' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Logout failed.' });
    }
});

/**
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 */
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }

        const fullName = data.user.user_metadata?.full_name || '';

        res.json({
            user: {
                id: data.user.id,
                email: data.user.email,
                name: fullName,
            },
        });
    } catch (err) {
        console.error('Auth check error:', err);
        res.status(500).json({ error: 'Failed to verify authentication.' });
    }
});

export default router;
