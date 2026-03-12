import * as aiService from '../services/ai.js';

export async function getFoodAnalysis(req, res) {
    try {
        const { foods } = req.body;
        if (!foods || !Array.isArray(foods) || foods.length === 0) {
            return res.status(400).json({ error: 'Please provide an array of food names.' });
        }

        const result = await aiService.analyzeFood(foods);
        res.json(result);
    } catch (err) {
        console.error('Food analysis error:', err);
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Failed to analyze food. Please try again.' });
    }
}

export async function createMealPlan(req, res) {
    try {
        const { height, weight, age, gender, activity, goal, dietaryPreference, targetCalories, targetProtein } = req.body;
        if (!height || !weight || !age) {
            return res.status(400).json({ error: 'Missing required fields: height, weight, age.' });
        }

        const result = await aiService.generateMealPlan(req.body);
        res.json(result);
    } catch (err) {
        console.error('Meal plan error:', err);
        res.status(500).json({ error: err.message || 'Failed to generate meal plan.' });
    }
}

export async function getNutritionNews(req, res) {
    try {
        const result = await aiService.getNutritionNews();
        res.json(result);
    } catch (err) {
        console.error('Nutrition news error:', err);
        res.status(500).json({ error: 'Failed to retrieve nutrition news.' });
    }
}

export async function getSymptomRemedy(req, res) {
    try {
        const { symptom } = req.body;
        if (!symptom || typeof symptom !== 'string' || symptom.trim().length === 0) {
            return res.status(400).json({ error: 'Please provide a symptom description.' });
        }

        const result = await aiService.getSymptomRemedy(symptom);
        res.json(result);
    } catch (err) {
        console.error('Symptom remedy error:', err);
        res.status(500).json({ error: err.message || 'Failed to get remedy suggestions. Please try again.' });
    }
}

export async function getGroceryList(req, res) {
    try {
        const plan = req.body.sevenDayPlan || req.body.seven_day_plan;
        
        if (!plan || !Array.isArray(plan) || plan.length === 0) {
            return res.status(400).json({ error: 'Please provide the sevenDayPlan array.' });
        }

        const result = await aiService.generateGroceryList(plan);
        res.json(result);
    } catch (err) {
        console.error('Grocery list error:', err);
        res.status(500).json({ error: err.message || 'Failed to generate grocery list. Please try again.' });
    }
}

export async function analyzeDosha(req, res) {
    try {
        const { quizAnswers } = req.body;
        if (!quizAnswers || typeof quizAnswers !== 'object' || Object.keys(quizAnswers).length === 0) {
            return res.status(400).json({ error: 'Please provide your quiz answers.' });
        }

        const result = await aiService.analyzeDosha(quizAnswers);
        res.json(result);
    } catch (err) {
        console.error('Dosha analyzer error:', err);
        res.status(500).json({ error: err.message || 'Failed to analyze dosha. Please try again.' });
    }
}

export async function getFoodLogSummary(req, res) {
    try {
        const { entries, targetCalories } = req.body;
        if (!entries || !Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: 'Please provide at least one food log entry.' });
        }

        const result = await aiService.generateFoodLogSummary(entries, targetCalories);
        res.json(result);
    } catch (err) {
        console.error('Food log summary error:', err);
        res.status(500).json({ error: err.message || 'Failed to generate food log summary.' });
    }
}

export async function getHydrationAdvice(req, res) {
    try {
        const { weight, age, activityLevel } = req.body;
        if (!weight || !age || !activityLevel) {
            return res.status(400).json({ error: 'Please provide weight, age, and activity level.' });
        }

        const result = await aiService.generateHydrationAdvice(req.body);
        res.json(result);
    } catch (err) {
        console.error('Hydration advisor error:', err);
        res.status(500).json({ error: err.message || 'Failed to generate hydration advice.' });
    }
}
