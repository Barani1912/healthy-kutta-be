import { Router } from 'express';
import { FOOD_ANALYSIS_PROMPT, MEAL_PLAN_PROMPT } from '../lib/prompts.js';

const router = Router();

const OPENROUTER_URL = process.env.OPENROUTER_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL;

/**
 * Helper: call OpenRouter API
 */
async function callLLM(systemPrompt, userPrompt, { temperature = 0.3, maxTokens = 8192 } = {}) {
    const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GEMINI_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://healthykutta.app',
            'X-Title': 'Healthy Kutta'
        },
        body: JSON.stringify({
            model: GEMINI_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} — ${errData?.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty response from AI.');

    // Parse JSON (strip markdown fences if any)
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
}

/**
 * POST /api/ai/food-analysis
 * Body: { foods: ["Banana", "Mango"] }
 */
router.post('/food-analysis', async (req, res) => {
    try {
        const { foods } = req.body;

        if (!foods || !Array.isArray(foods) || foods.length === 0) {
            return res.status(400).json({ error: 'Please provide an array of food names.' });
        }

        // Basic sanitization
        const safeFoods = foods
            .map(f => String(f).replace(/[<>{}]/g, '').trim())
            .filter(f => f.length >= 1 && f.length <= 100);

        if (safeFoods.length === 0) {
            return res.status(400).json({ error: 'No valid food names provided.' });
        }

        const userPrompt = `Analyze these food items for a Tamil Nadu user: ${safeFoods.join(', ')}

Provide complete nutritional information, optimal timing, health benefits, food combinations (compatible & incompatible), preparation guidelines, and health warnings for each item. Also analyze the combination if multiple items are selected.`;

        const parsed = await callLLM(FOOD_ANALYSIS_PROMPT, userPrompt);

        if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
            return res.status(500).json({ error: 'AI response did not contain food analysis data.' });
        }

        res.json(parsed);
    } catch (err) {
        console.error('Food analysis error:', err);
        res.status(500).json({ error: err.message || 'Failed to analyze food. Please try again.' });
    }
});

/**
 * POST /api/ai/meal-plan
 * Body: { height, weight, age, gender, activity, goal, dietaryPreference, targetCalories, targetProtein }
 */
router.post('/meal-plan', async (req, res) => {
    try {
        const { height, weight, age, gender, activity, goal, dietaryPreference, targetCalories, targetProtein } = req.body;

        if (!height || !weight || !age) {
            return res.status(400).json({ error: 'Missing required fields: height, weight, age.' });
        }

        const userPrompt = `Generate a 7-day Tamil Nadu meal plan for:
- Profile: ${gender}, ${age} years, ${height}cm, ${weight}kg
- Activity: ${activity}
- Goal: ${goal}
- Targets: ${targetCalories} kcal/day, ${targetProtein}g protein/day
- Dietary Preference: ${dietaryPreference}

Ensure the plan follows Tamil Nadu cuisine, respects the ${dietaryPreference} dietary preference strictly, and provides 7 full days of variety.`;

        const parsed = await callLLM(MEAL_PLAN_PROMPT, userPrompt, { temperature: 0.5, maxTokens: 4000 });

        if (!parsed.seven_day_plan || !Array.isArray(parsed.seven_day_plan)) {
            return res.status(500).json({ error: 'AI returned invalid meal plan format.' });
        }

        res.json(parsed);
    } catch (err) {
        console.error('Meal plan error:', err);
        res.status(500).json({ error: err.message || 'Failed to generate meal plan.' });
    }
});

export default router;
