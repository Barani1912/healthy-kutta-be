import { Router } from 'express';
import { supabase, createUserClient } from '../lib/supabase.js';

const router = Router();

/**
 * Middleware: extract user from Authorization header
 */
async function requireAuth(req, res, next) {
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

// ─── Diet Plans ───

/**
 * POST /api/saved/diet-plans
 * Body: { formData, resultData }
 */
router.post('/diet-plans', requireAuth, async (req, res) => {
    try {
        const { formData, resultData } = req.body;
        const userClient = createUserClient(req.accessToken);

        const { data, error } = await userClient
            .from('saved_diet_plans')
            .insert({
                user_id: req.user.id,
                form_data: formData,
                result_data: resultData
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Save diet plan error:', err);
        res.status(500).json({ error: 'Failed to save diet plan.' });
    }
});

/**
 * GET /api/saved/diet-plans
 */
router.get('/diet-plans', requireAuth, async (req, res) => {
    try {
        const userClient = createUserClient(req.accessToken);

        const { data, error } = await userClient
            .from('saved_diet_plans')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Get diet plans error:', err);
        res.status(500).json({ error: 'Failed to fetch saved diet plans.' });
    }
});

/**
 * DELETE /api/saved/diet-plans/:id
 */
router.delete('/diet-plans/:id', requireAuth, async (req, res) => {
    try {
        const userClient = createUserClient(req.accessToken);

        const { error } = await userClient
            .from('saved_diet_plans')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ message: 'Deleted successfully.' });
    } catch (err) {
        console.error('Delete diet plan error:', err);
        res.status(500).json({ error: 'Failed to delete diet plan.' });
    }
});

// ─── Food Comparisons ───

/**
 * POST /api/saved/food-comparisons
 * Body: { selectedFoods, resultData }
 */
router.post('/food-comparisons', requireAuth, async (req, res) => {
    try {
        const { selectedFoods, resultData } = req.body;
        const userClient = createUserClient(req.accessToken);

        const { data, error } = await userClient
            .from('saved_food_comparisons')
            .insert({
                user_id: req.user.id,
                selected_foods: selectedFoods,
                result_data: resultData
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Save comparison error:', err);
        res.status(500).json({ error: 'Failed to save food comparison.' });
    }
});

/**
 * GET /api/saved/food-comparisons
 */
router.get('/food-comparisons', requireAuth, async (req, res) => {
    try {
        const userClient = createUserClient(req.accessToken);

        const { data, error } = await userClient
            .from('saved_food_comparisons')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Get comparisons error:', err);
        res.status(500).json({ error: 'Failed to fetch saved comparisons.' });
    }
});

/**
 * DELETE /api/saved/food-comparisons/:id
 */
router.delete('/food-comparisons/:id', requireAuth, async (req, res) => {
    try {
        const userClient = createUserClient(req.accessToken);

        const { error } = await userClient
            .from('saved_food_comparisons')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ message: 'Deleted successfully.' });
    } catch (err) {
        console.error('Delete comparison error:', err);
        res.status(500).json({ error: 'Failed to delete comparison.' });
    }
});

export default router;
