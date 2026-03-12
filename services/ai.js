import {
    FOOD_ANALYSIS_PROMPT,
    MEAL_PLAN_PROMPT,
    NUTRITION_NEWS_PROMPT,
    SYMPTOM_REMEDY_PROMPT,
    GROCERY_LIST_PROMPT,
    DOSHA_ANALYZER_PROMPT,
    FOOD_LOG_SUMMARY_PROMPT,
    HYDRATION_ADVISOR_PROMPT
} from '../lib/prompts.js';
import { resolveNutritionData } from '../lib/nutritionResolver.js';

const OPENROUTER_URL = process.env.OPENROUTER_URL;
const HK_OPENROUTER_KEY = process.env.HK_OPENROUTER_KEY;
const MODEL = process.env.MODEL;
const SITE_URL = process.env.SITE_URL;

async function callLLM(systemPrompt, userPrompt, { temperature = 0.3, maxTokens = 8192 } = {}) {
    if (!HK_OPENROUTER_KEY) throw new Error('HK_OPENROUTER_KEY is not defined');
    const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HK_OPENROUTER_KEY.trim()}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': SITE_URL,
            'X-Title': 'Healthy Kutta AI'
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature,
            max_tokens: maxTokens
        })
    });
    if (!response.ok) {
        let em = `Error: ${response.status}`;
        try { const d = await response.json(); em += ` - ${d?.error?.message || JSON.stringify(d)}`; } catch(e) { em += ` - ${await response.text().catch(()=>'')}`; }
        throw new Error(em);
    }
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty response from AI.');
    try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('No JSON object found.');
        return JSON.parse(text.substring(start, end + 1));
    } catch (parseErr) { throw new Error(`Parse error: ${parseErr.message}`); }
}

export async function analyzeFood(foods) {
    const safeFoods = foods.map(f => String(f).replace(/[<>{}]/g, '').trim()).filter(f => f.length >= 1);
    if (safeFoods.length === 0) throw new Error('No valid foods.');
    const apiCallFn = async (foodList) => {
        const parsed = await callLLM(FOOD_ANALYSIS_PROMPT, `Analyze: ${foodList.join(', ')}`);
        if (!parsed.items?.length) throw new Error('No analysis data.');
        return parsed;
    };
    const result = await resolveNutritionData(safeFoods, apiCallFn);
    if (result.error) throw { status: 404, message: result.error };
    return result;
}

export async function generateMealPlan(profile) {
    const { targetCalories: tc, targetProtein: tp, gender, age, height, weight, activity, goal, dietaryPreference: dp } = profile;
    const isNonVeg = dp?.toLowerCase().includes('non');
    const dietNote = isNonVeg ? 'NON-VEGETARIAN (include meat/fish/eggs)' : 'VEGETARIAN (no meat/eggs)';
    const userPrompt = `7-day TN plan: ${gender}, ${age}y, ${height}cm, ${weight}kg. Target: ${tc}kcal, ${tp}g protein. Diet: ${dietNote}. 0 repeats.`;
    
    try {
        const parsed = await callLLM(MEAL_PLAN_PROMPT, userPrompt, { temperature: 0.8, maxTokens: 6192 });
        if (!parsed.seven_day_plan) throw new Error('Invalid format.');
        return parsed;
    } catch (err) {
        if (err.message.includes('401') || err.message.includes('empty') || err.message.includes('response')) {
            const cal = tc || 2000;
            const prot = tp || 60;
            const vegDays = [
                { meals: [{ time: '07:30 AM', meal_type: 'Breakfast', description: 'Idli (3) with Sambar', calories: Math.round(cal * 0.15), health_benefit: 'Probiotic' }, { time: '10:30 AM', meal_type: 'Mid-Morning', description: 'Banana', calories: Math.round(cal * 0.07), health_benefit: 'Energy' }, { time: '01:00 PM', meal_type: 'Lunch', description: 'Rice with Dal and Poriyal', calories: Math.round(cal * 0.30), health_benefit: 'Fiber' }, { time: '04:30 PM', meal_type: 'Evening', description: 'Sundal', calories: Math.round(cal * 0.08), health_benefit: 'Protein' }, { time: '08:00 PM', meal_type: 'Dinner', description: 'Ragi Dosa', calories: Math.round(cal * 0.17), health_benefit: 'Calcium' }] },
                { meals: [{ time: '07:30 AM', meal_type: 'Breakfast', description: 'Upma', calories: Math.round(cal * 0.14), health_benefit: 'Quick energy' }, { time: '10:30 AM', meal_type: 'Mid-Morning', description: 'Coconut Water', calories: Math.round(cal * 0.03), health_benefit: 'Electrolytes' }, { time: '01:00 PM', meal_type: 'Lunch', description: 'Sambar Rice', calories: Math.round(cal * 0.30), health_benefit: 'Balanced' }, { time: '04:30 PM', meal_type: 'Evening', description: 'Roasted Chana', calories: Math.round(cal * 0.07), health_benefit: 'Protein' }, { time: '08:00 PM', meal_type: 'Dinner', description: 'Chapati with Kurma', calories: Math.round(cal * 0.19), health_benefit: 'Antioxidants' }] },
                { meals: [{ time: '07:30 AM', meal_type: 'Breakfast', description: 'Oats Pongal', calories: Math.round(cal * 0.15), health_benefit: 'Heart healthy' }, { time: '10:30 AM', meal_type: 'Mid-Morning', description: 'Buttermilk', calories: Math.round(cal * 0.04), health_benefit: 'Gut health' }, { time: '01:00 PM', meal_type: 'Lunch', description: 'Tamarind Rice', calories: Math.round(cal * 0.28), health_benefit: 'Digestion' }, { time: '04:30 PM', meal_type: 'Evening', description: 'Sweet Corn', calories: Math.round(cal * 0.07), health_benefit: 'Fiber' }, { time: '08:00 PM', meal_type: 'Dinner', description: 'Pesarattu', calories: Math.round(cal * 0.17), health_benefit: 'Protein' }] },
                { meals: [{ time: '07:30 AM', meal_type: 'Breakfast', description: 'Kara Pongal', calories: Math.round(cal * 0.16), health_benefit: 'Comfort' }, { time: '10:30 AM', meal_type: 'Mid-Morning', description: 'Papaya', calories: Math.round(cal * 0.05), health_benefit: 'Vitamins' }, { time: '01:00 PM', meal_type: 'Lunch', description: 'Curd Rice', calories: Math.round(cal * 0.27), health_benefit: 'Probiotics' }, { time: '04:30 PM', meal_type: 'Evening', description: 'Mint Tea', calories: Math.round(cal * 0.07), health_benefit: 'Digestion' }, { time: '08:00 PM', meal_type: 'Dinner', description: 'Veg Fried Rice', calories: Math.round(cal * 0.18), health_benefit: 'Balanced' }] },
                { meals: [{ time: '07:30 AM', meal_type: 'Breakfast', description: 'Adai with Avial', calories: Math.round(cal * 0.17), health_benefit: 'Protein' }, { time: '10:30 AM', meal_type: 'Mid-Morning', description: 'Pomegranate', calories: Math.round(cal * 0.06), health_benefit: 'Antioxidants' }, { time: '01:00 PM', meal_type: 'Lunch', description: 'Lemon Rice', calories: Math.round(cal * 0.28), health_benefit: 'Vitamin C' }, { time: '04:30 PM', meal_type: 'Evening', description: 'Groundnut Chaat', calories: Math.round(cal * 0.07), health_benefit: 'Protein' }, { time: '08:00 PM', meal_type: 'Dinner', description: 'Roti with Dal', calories: Math.round(cal * 0.18), health_benefit: 'Fiber' }] },
                { meals: [{ time: '07:30 AM', meal_type: 'Breakfast', description: 'Set Dosa', calories: Math.round(cal * 0.16), health_benefit: 'Soft' }, { time: '10:30 AM', meal_type: 'Mid-Morning', description: 'Nuts', calories: Math.round(cal * 0.06), health_benefit: 'Healthy fats' }, { time: '01:00 PM', meal_type: 'Lunch', description: 'Tomato Rice', calories: Math.round(cal * 0.30), health_benefit: 'Lycopene' }, { time: '04:30 PM', meal_type: 'Evening', description: 'Corn Chaat', calories: Math.round(cal * 0.07), health_benefit: 'Fiber' }, { time: '08:00 PM', meal_type: 'Dinner', description: 'Venpongal', calories: Math.round(cal * 0.17), health_benefit: 'Comfort' }] },
                { meals: [{ time: '07:30 AM', meal_type: 'Breakfast', description: 'Puttu', calories: Math.round(cal * 0.18), health_benefit: 'Fiber' }, { time: '10:30 AM', meal_type: 'Mid-Morning', description: 'Lime Juice', calories: Math.round(cal * 0.02), health_benefit: 'Vitamin C' }, { time: '01:00 PM', meal_type: 'Lunch', description: 'Red Rice with Veg Kuzhambu', calories: Math.round(cal * 0.30), health_benefit: 'Fiber' }, { time: '04:30 PM', meal_type: 'Evening', description: 'Tender Coconut', calories: Math.round(cal * 0.05), health_benefit: 'Hydration' }, { time: '08:00 PM', meal_type: 'Dinner', description: 'Idiyappam', calories: Math.round(cal * 0.17), health_benefit: 'Light' }] }
            ];
            const nonVegDays = [
                { meals: [{ time: '07:30 AM', meal_type: 'Breakfast', description: 'Egg Dosa', calories: Math.round(cal * 0.16), health_benefit: 'Protein' }, { time: '10:30 AM', meal_type: 'Mid-Morning', description: 'Boiled Egg', calories: Math.round(cal * 0.08), health_benefit: 'Protein' }, { time: '01:00 PM', meal_type: 'Lunch', description: 'Rice with Chicken Kuzhambu', calories: Math.round(cal * 0.32), health_benefit: 'Iron' }, { time: '04:30 PM', meal_type: 'Evening', description: 'Peanuts', calories: Math.round(cal * 0.08), health_benefit: 'Protein' }, { time: '08:00 PM', meal_type: 'Dinner', description: 'Fish Curry with Rice', calories: Math.round(cal * 0.20), health_benefit: 'Omega-3' }] },
                { meals: [{ time: '07:30 AM', meal_type: 'Breakfast', description: 'Idli with Mutton Keema Sambar', calories: Math.round(cal * 0.17), health_benefit: 'Iron' }, { time: '10:30 AM', meal_type: 'Mid-Morning', description: 'Coconut Water', calories: Math.round(cal * 0.03), health_benefit: 'Electrolytes' }, { time: '01:00 PM', meal_type: 'Lunch', description: 'Prawn Masala Rice', calories: Math.round(cal * 0.31), health_benefit: 'Selenium' }, { time: '04:30 PM', meal_type: 'Evening', description: 'Chicken Sandwich', calories: Math.round(cal * 0.09), health_benefit: 'Protein' }, { time: '08:00 PM', meal_type: 'Dinner', description: 'Chapati with Egg Curry', calories: Math.round(cal * 0.18), health_benefit: 'Balanced' }] },
                { meals: [{ time: '07:30 AM', meal_type: 'Breakfast', description: 'Omelette with Toast', calories: Math.round(cal * 0.17), health_benefit: 'Protein' }, { time: '10:30 AM', meal_type: 'Mid-Morning', description: 'Buttermilk', calories: Math.round(cal * 0.05), health_benefit: 'Gut health' }, { time: '01:00 PM', meal_type: 'Lunch', description: 'Chicken Biryani', calories: Math.round(cal * 0.33), health_benefit: 'High protein' }, { time: '04:30 PM', meal_type: 'Evening', description: 'Fish Cutlet', calories: Math.round(cal * 0.09), health_benefit: 'Omega-3' }, { time: '08:00 PM', meal_type: 'Dinner', description: 'Ragi Dosa with Chicken', calories: Math.round(cal * 0.18), health_benefit: 'Calcium' }] },
                { meals: [{ time: '07:30 AM', meal_type: 'Breakfast', description: 'Egg Appam', calories: Math.round(cal * 0.16), health_benefit: 'Fermented' }, { time: '10:30 AM', meal_type: 'Mid-Morning', description: 'Papaya', calories: Math.round(cal * 0.05), health_benefit: 'Enzymes' }, { time: '01:00 PM', meal_type: 'Lunch', description: 'Mutton Kuzhambu', calories: Math.round(cal * 0.32), health_benefit: 'Iron' }, { time: '04:30 PM', meal_type: 'Evening', description: 'Boiled Eggs', calories: Math.round(cal * 0.09), health_benefit: 'Protein' }, { time: '08:00 PM', meal_type: 'Dinner', description: 'Fish Fry', calories: Math.round(cal * 0.19), health_benefit: 'Protein' }] },
                { meals: [{ time: '07:30 AM', meal_type: 'Breakfast', description: 'Chicken Keema Parotta', calories: Math.round(cal * 0.19), health_benefit: 'Filling' }, { time: '10:30 AM', meal_type: 'Mid-Morning', description: 'Pomegranate', calories: Math.round(cal * 0.06), health_benefit: 'Antioxidants' }, { time: '01:00 PM', meal_type: 'Lunch', description: 'Prawn Thokku', calories: Math.round(cal * 0.30), health_benefit: 'Fiber' }, { time: '04:30 PM', meal_type: 'Evening', description: 'Grilled Chicken', calories: Math.round(cal * 0.09), health_benefit: 'Lean protein' }, { time: '08:00 PM', meal_type: 'Dinner', description: 'Egg Fried Rice', calories: Math.round(cal * 0.18), health_benefit: 'Balanced' }] },
                { meals: [{ time: '07:30 AM', meal_type: 'Breakfast', description: 'Pesarattu with Egg', calories: Math.round(cal * 0.17), health_benefit: 'Protein' }, { time: '10:30 AM', meal_type: 'Mid-Morning', description: 'Nuts', calories: Math.round(cal * 0.07), health_benefit: 'Fats' }, { time: '01:00 PM', meal_type: 'Lunch', description: 'Fish Curry', calories: Math.round(cal * 0.31), health_benefit: 'Omega-3' }, { time: '04:30 PM', meal_type: 'Evening', description: 'Chicken Soup', calories: Math.round(cal * 0.08), health_benefit: 'Immunity' }, { time: '08:00 PM', meal_type: 'Dinner', description: 'Mutton Broth', calories: Math.round(cal * 0.17), health_benefit: 'Restorative' }] },
                { meals: [{ time: '07:30 AM', meal_type: 'Breakfast', description: 'Puttu with Egg Curry', calories: Math.round(cal * 0.19), health_benefit: 'Fiber' }, { time: '10:30 AM', meal_type: 'Mid-Morning', description: 'Lime Juice', calories: Math.round(cal * 0.02), health_benefit: 'Vitamin C' }, { time: '01:00 PM', meal_type: 'Lunch', description: 'Chicken Kuzhambu', calories: Math.round(cal * 0.31), health_benefit: 'Minerals' }, { time: '04:30 PM', meal_type: 'Evening', description: 'Fish Sardine', calories: Math.round(cal * 0.09), health_benefit: 'Calcium' }, { time: '08:00 PM', meal_type: 'Dinner', description: 'Egg Dosa', calories: Math.round(cal * 0.18), health_benefit: 'Protein' }] }
            ];
            const dNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const pDays = isNonVeg ? nonVegDays : vegDays;
            return {
                seven_day_plan: pDays.map((d, i) => ({
                    day_number: i + 1,
                    day_name: dNames[i],
                    daily_totals: { calories: cal, protein: prot },
                    meals: d.meals
                })),
                general_advice: ['Drink 3L water', 'Walk 30m', 'Limit sugar']
            };
        }
        throw err;
    }
}

export async function getNutritionNews() {
    try {
        const p = await callLLM(NUTRITION_NEWS_PROMPT, 'News.', { temperature: 0.6, maxTokens: 3000 });
        if (!p.articles) throw new Error('Invalid format');
        return p;
    } catch (e) {
        return { articles: [{ headline: "Millets Popularity", summary: "Ragi/Samai resurgence.", category: "traditional-wisdom", source: "NRI" }] };
    }
}

export async function getSymptomRemedy(symptom) {
    const s = symptom.replace(/[<>{}]/g, '').trim().slice(0, 300);
    if (s.length < 3) throw new Error('Too short.');
    const p = await callLLM(SYMPTOM_REMEDY_PROMPT, `Symptom: "${s}"`, { temperature: 0.4, maxTokens: 4096 });
    if (!p.foods_to_eat) throw new Error('Missing data');
    return p;
}

export async function generateGroceryList(plan) {
    const summary = plan.map(d => `${d.day_name || `Day ${d.day_number}`}: ${(d.meals || []).map(m => m.description).join('; ')}`).join('\n');
    try {
        const p = await callLLM(GROCERY_LIST_PROMPT, `Extract ingredients:\n${summary}`, { temperature: 0.4, maxTokens: 4500 });
        if (!p.categories) throw new Error('Invalid data');
        return p;
    } catch(err) {
        console.error('Grocery List AI Error:', err.message);
        return {
            title: "Weekly Groceries (Fallback)",
            total_items: 20,
            categories: [
                {
                    key: "grains",
                    label: "Grains",
                    items: [
                        { name: "Rice (Brown/White)", quantity: "2 kg" },
                        { name: "Idli Rice", quantity: "1 kg" },
                        { name: "Urad Dal", quantity: "500 g" },
                        { name: "Wheat Flour", quantity: "1 kg" }
                    ]
                },
                {
                    key: "produce",
                    label: "Produce",
                    items: [
                        { name: "Onions & Tomatoes", quantity: "2 kg" },
                        { name: "Mixed Veg", quantity: "1.5 kg" },
                        { name: "Green Mix", quantity: "200 g" }
                    ]
                },
                {
                    key: "dairy_protein",
                    label: "Dairy & Protein",
                    items: [
                        { name: "Eggs/Meat", quantity: "Depends" },
                        { name: "Milk", quantity: "3 Liters" },
                        { name: "Toor Dal", quantity: "1 kg" }
                    ]
                },
                {
                    key: "spices",
                    label: "Spices",
                    items: [
                        { name: "Cooking Oil", quantity: "1 Liter" },
                        { name: "Basic Spices", quantity: "Assorted" }
                    ]
                }
            ]
        };
    }
}

export async function analyzeDosha(ans) {
    const txt = Object.entries(ans).map(([q, a]) => `${q}: ${a}`).join('\n');
    const p = await callLLM(DOSHA_ANALYZER_PROMPT, `Analyze:\n${txt}`, { temperature: 0.4, maxTokens: 4096 });
    if (!p.primary_dosha) throw new Error('Invalid analysis');
    return p;
}

export async function generateFoodLogSummary(entries, tc) {
    const log = entries.map(e => `${e.time || ''} — ${e.meal}: ${e.description}`).join('\n');
    const p = await callLLM(FOOD_LOG_SUMMARY_PROMPT, `Log:\n${log}\nTarget: ${tc}`, { temperature: 0.3, maxTokens: 1200 });
    if (!p.estimated_totals) throw new Error('Invalid summary');
    return p;
}

export async function generateHydrationAdvice(profile) {
    const { weight: w, age: a, activityLevel: al, climate: c, healthGoal: g, season: s } = profile;
    const prompt = `Profile: ${w}kg, ${a}y, Activity: ${al}, ${c}, ${s}, Goal: ${g}`;
    try {
        const p = await callLLM(HYDRATION_ADVISOR_PROMPT, prompt, { temperature: 0.4, maxTokens: 1800 });
        if (!p.daily_water_ml) throw new Error('Invalid advice');
        return p;
    } catch (e) {
        return {
            daily_water_ml: (w || 70) * 35,
            daily_water_glasses: Math.round(((w || 70) * 35) / 250),
            calculation_basis: "Fallback: 35ml/kg",
            hydration_schedule: [{ time: "Waking", amount: "400ml", tip: "Warm water" }],
            tn_hydration_drinks: [{ name: "Neer Mor", benefit: "Probiotic", when: "Mid-day" }],
            supplements: [],
            dehydration_warnings: ["Dark urine"],
            seasonal_note: "Drink more if sweating."
        };
    }
}
