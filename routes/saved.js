import { Router } from 'express';
import { createUserClient } from '../lib/supabase.js';
import { requireAuth } from '../lib/authMiddleware.js';

const router = Router();

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

        if (error) {
            console.error('Supabase insert error [food-comparisons]:', error);
            throw error;
        }
        res.json(data);
    } catch (err) {
        console.error('Save comparison exception:', err);
        res.status(500).json({ error: err.message || 'Failed to save food comparison.' });
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

// ─── Dosha Results ───

router.post('/dosha-results', requireAuth, async (req, res) => {
    try {
        const { quizAnswers, resultData } = req.body;
        const userClient = createUserClient(req.accessToken);

        const { data, error } = await userClient
            .from('saved_dosha_results')
            .insert({
                user_id: req.user.id,
                quiz_answers: quizAnswers,
                result_data: resultData
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Save dosha result error:', err);
        res.status(500).json({ error: 'Failed to save dosha result.' });
    }
});

router.get('/dosha-results', requireAuth, async (req, res) => {
    try {
        const userClient = createUserClient(req.accessToken);
        const { data, error } = await userClient
            .from('saved_dosha_results')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Get dosha results error:', err);
        res.status(500).json({ error: 'Failed to fetch saved dosha results.' });
    }
});

router.delete('/dosha-results/:id', requireAuth, async (req, res) => {
    try {
        const userClient = createUserClient(req.accessToken);
        const { error } = await userClient
            .from('saved_dosha_results')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ message: 'Deleted successfully.' });
    } catch (err) {
        console.error('Delete dosha result error:', err);
        res.status(500).json({ error: 'Failed to delete dosha result.' });
    }
});

// ─── Symptom Remedies ───

router.post('/symptom-remedies', requireAuth, async (req, res) => {
    try {
        const { symptomText, resultData } = req.body;
        const userClient = createUserClient(req.accessToken);

        const { data, error } = await userClient
            .from('saved_symptom_remedies')
            .insert({
                user_id: req.user.id,
                symptom_text: symptomText,
                result_data: resultData
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Save symptom remedy error:', err);
        res.status(500).json({ error: 'Failed to save symptom remedy.' });
    }
});

router.get('/symptom-remedies', requireAuth, async (req, res) => {
    try {
        const userClient = createUserClient(req.accessToken);
        const { data, error } = await userClient
            .from('saved_symptom_remedies')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Get symptom remedies error:', err);
        res.status(500).json({ error: 'Failed to fetch saved symptom remedies.' });
    }
});

router.delete('/symptom-remedies/:id', requireAuth, async (req, res) => {
    try {
        const userClient = createUserClient(req.accessToken);
        const { error } = await userClient
            .from('saved_symptom_remedies')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ message: 'Deleted successfully.' });
    } catch (err) {
        console.error('Delete symptom remedy error:', err);
        res.status(500).json({ error: 'Failed to delete symptom remedy.' });
    }
});

// ─── Hydration Plans ───

router.post('/hydration-plans', requireAuth, async (req, res) => {
    try {
        const { formData, resultData } = req.body;
        const userClient = createUserClient(req.accessToken);

        const { data, error } = await userClient
            .from('saved_hydration_plans')
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
        console.error('Save hydration plan error:', err);
        res.status(500).json({ error: 'Failed to save hydration plan.' });
    }
});

router.get('/hydration-plans', requireAuth, async (req, res) => {
    try {
        const userClient = createUserClient(req.accessToken);
        const { data, error } = await userClient
            .from('saved_hydration_plans')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Get hydration plans error:', err);
        res.status(500).json({ error: 'Failed to fetch saved hydration plans.' });
    }
});

router.delete('/hydration-plans/:id', requireAuth, async (req, res) => {
    try {
        const userClient = createUserClient(req.accessToken);
        const { error } = await userClient
            .from('saved_hydration_plans')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ message: 'Deleted successfully.' });
    } catch (err) {
        console.error('Delete hydration plan error:', err);
        res.status(500).json({ error: 'Failed to delete hydration plan.' });
    }
});

// ─── Food Log Summaries ───

router.post('/foodlog-summaries', requireAuth, async (req, res) => {
    try {
        const { entries, resultData } = req.body;
        const userClient = createUserClient(req.accessToken);

        const { data, error } = await userClient
            .from('saved_foodlog_summaries')
            .insert({
                user_id: req.user.id,
                entries: entries,
                result_data: resultData
            })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Save food log summary error:', err);
        res.status(500).json({ error: 'Failed to save food log summary.' });
    }
});

router.get('/foodlog-summaries', requireAuth, async (req, res) => {
    try {
        const userClient = createUserClient(req.accessToken);
        const { data, error } = await userClient
            .from('saved_foodlog_summaries')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Get food log summaries error:', err);
        res.status(500).json({ error: 'Failed to fetch saved food log summaries.' });
    }
});

router.delete('/foodlog-summaries/:id', requireAuth, async (req, res) => {
    try {
        const userClient = createUserClient(req.accessToken);
        const { error } = await userClient
            .from('saved_foodlog_summaries')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ message: 'Deleted successfully.' });
    } catch (err) {
        console.error('Delete food log summary error:', err);
        res.status(500).json({ error: 'Failed to delete food log summary.' });
    }
});

export default router;
