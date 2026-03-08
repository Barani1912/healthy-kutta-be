import { Router } from 'express';
import { FOOD_ANALYSIS_PROMPT, MEAL_PLAN_PROMPT, NUTRITION_NEWS_PROMPT, SYMPTOM_REMEDY_PROMPT, GROCERY_LIST_PROMPT, DOSHA_ANALYZER_PROMPT, FOOD_LOG_SUMMARY_PROMPT, HYDRATION_ADVISOR_PROMPT } from '../lib/prompts.js';
import { resolveNutritionData } from '../lib/nutritionResolver.js';




const router = Router();

const OPENROUTER_URL = process.env.OPENROUTER_URL;
const HK_OPENROUTER_KEY = process.env.HK_OPENROUTER_KEY;
const MODEL = process.env.MODEL;
const SITE_URL = process.env.SITE_URL;

/**
 * Helper: call OpenRouter API
 */
async function callLLM(systemPrompt, userPrompt, { temperature = 0.3, maxTokens = 8192 } = {}) {
    if (!HK_OPENROUTER_KEY) {
        throw new Error('HK_OPENROUTER_KEY is not defined in backend .env');
    }

    console.log(`[AI] Calling model ${MODEL} with maxTokens=${maxTokens}`);

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
        let errMessage = `OpenRouter API error: ${response.status}`;
        try {
            const errData = await response.json();
            errMessage += ` — ${errData?.error?.message || JSON.stringify(errData)}`;
        } catch (e) {
            const text = await response.text().catch(() => '');
            errMessage += ` — ${text || 'Unknown error'}`;
        }
        throw new Error(errMessage);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
        console.error('[AI] Empty response body from OpenRouter.');
        throw new Error('Empty response from AI.');
    }

    try {
        // Find the first { and last } to extract JSON
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');

        if (start === -1 || end === -1) {
            console.error('[AI] No JSON found in response. Text was:', text);
            throw new Error('No valid JSON object found in response.');
        }

        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr);
    } catch (parseErr) {
        console.error('[AI] JSON Parse Error:', parseErr);
        console.error('[AI] Raw text that failed parsing:', text);
        throw new Error(`Failed to parse AI response: ${parseErr.message}`);
    }
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

        const apiCallFn = async (foodList) => {
            const userPrompt = `Analyze these food items for a Tamil Nadu user: ${foodList.join(', ')}

Provide complete nutritional information, optimal timing, health benefits, food combinations (compatible & incompatible), preparation guidelines, and health warnings for each item. Also analyze the combination if multiple items are selected.`;

            const parsed = await callLLM(FOOD_ANALYSIS_PROMPT, userPrompt);

            if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
                throw new Error('AI response did not contain food analysis data.');
            }
            return parsed;
        };

        const result = await resolveNutritionData(safeFoods, apiCallFn);

        if (result.source === 'not_found' || result.error) {
            return res.status(404).json({ error: result.error || 'Food not found.' });
        }

        res.json(result);
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

        const parsed = await callLLM(MEAL_PLAN_PROMPT, userPrompt, { temperature: 0.5, maxTokens: 4250 });

        if (!parsed.seven_day_plan || !Array.isArray(parsed.seven_day_plan)) {
            return res.status(500).json({ error: 'AI returned invalid meal plan format.' });
        }

        res.json(parsed);
    } catch (err) {
        console.error('Meal plan error:', err);
        const isAuthError = err.message.includes('401') || err.message.includes('key');
        const isEmptyResponse = err.message.includes('Empty response') || err.message.includes('empty');
        if (isAuthError || isEmptyResponse) {
            console.log('Serving fallback meal plan due to:', isAuthError ? 'auth error' : 'empty AI response');
            return res.json({
                seven_day_plan: Array.from({ length: 7 }, (_, i) => ({
                    day_number: i + 1,
                    day_name: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i],
                    daily_totals: { calories: req.body.targetCalories || 2000, protein: req.body.targetProtein || 60 },
                    meals: [
                        { time: "08:30 AM", meal_type: "Breakfast", description: "Idli with Sambar and Coconut Chutney", calories: 350, health_benefit: "Probiotic and easy to digest" },
                        { time: "11:00 AM", meal_type: "Mid-Morning", description: "Fresh Coconut Water or Buttermilk", calories: 50, health_benefit: "Hydration and minerals" },
                        { time: "01:30 PM", meal_type: "Lunch", description: "Brown Rice with Spinach Kootu and Rasam", calories: 600, health_benefit: "High fiber and iron" },
                        { time: "05:00 PM", meal_type: "Evening", description: "Sundal (Chickpea salad)", calories: 200, health_benefit: "Plant-based protein" },
                        { time: "08:30 PM", meal_type: "Dinner", description: "Ragi Dosa with Vegetable Salna", calories: 400, health_benefit: "Calcium and complex carbs" }
                    ]
                })),
                general_advice: ["Drink at least 3 liters of water", "Walk for 30 minutes daily", "Avoid processed sugars"]
            });
        }
        res.status(500).json({ error: err.message || 'Failed to generate meal plan.' });
    }
});

/**
 * POST /api/ai/nutrition-news
 * Returns top 10 AI-generated food & nutrition news items
 */
router.post('/nutrition-news', async (req, res) => {
    try {
        const userPrompt = `Generate the top 10 latest food and nutrition news articles for today. Cover a mix of global and Indian nutritional topics. Focus only on food, nutrition, diet, and wellness. Return valid JSON only.`;

        const parsed = await callLLM(NUTRITION_NEWS_PROMPT, userPrompt, { temperature: 0.6, maxTokens: 3000 });

        if (!parsed.articles || !Array.isArray(parsed.articles)) {
            throw new Error('Invalid news format from AI');
        }

        res.json(parsed);
    } catch (err) {
        console.error('Nutrition news error:', err);

        // Fallback to static high-quality news if AI fails
        console.log('Serving fallback static news due to API error.');
        res.json({
            articles: [
                {
                    headline: "Traditional Millets Regain Global Popularity for Diabetes Management",
                    summary: "As the health benefits of ancient grains become clearer, millets like Ragi and Samai are seeing a massive resurgence in South Indian diets for their low-glycemic index properties.",
                    category: "traditional-wisdom",
                    source: "Nutrition Research Institute",
                    image: "/news/news_millets.png"
                },
                {
                    headline: "Curcumin Bioavailability Boosted with Piperine: New Study Confirms",
                    summary: "Researchers have finally quantified the precise synergy between turmeric and black pepper, proving that piperine increases curcumin absorption by up to 2000% in the human gut.",
                    category: "nutrition-science",
                    source: "BioScience Journal",
                    image: "/news/news_turmeric.png"
                },
                {
                    headline: "The Impact of Moringa Oleifera on Post-Pandemic Immunity",
                    summary: "Global nutritionists are focusing on the 'Miracle Tree' leaves as a primary source of trace minerals and antioxidants for natural immune system support.",
                    category: "medicinal-plants",
                    source: "Wellness Today",
                    image: "/news/news_moringa.png"
                },
                {
                    headline: "Neem Oil Extract: A New Frontier in Natural Skin Therapeutics",
                    summary: "New clinical trials suggest that stabilized neem oil extracts are twice as effective as synthetic alternatives for treating chronic dermatitis and inflammatory skin conditions.",
                    category: "medicinal-plants",
                    source: "Dermatology Quarterly",
                    image: "/news/news_neem.png"
                },
                {
                    headline: "Siddha Medicine's Role in Modern Respiratory Health",
                    summary: "A joint study by WHO and Indian researchers highlights how traditional Siddha formulations using Tulsi and Adathoda are providing relief in urban environments with high pollution.",
                    category: "traditional-wisdom",
                    source: "Internal Health Review",
                    image: "/news/news_tulsi.png"
                },
                {
                    headline: "Triphala: The Golden Ratio of Ayurvedic Digestive Health",
                    summary: "The combination of Amla, Bibhitaki, and Haritaki is being hailed as the ultimate prebiotic, supporting a healthy gut microbiome better than synthetic fiber supplements.",
                    category: "superfoods",
                    source: "Ancient Wellness Digest",
                    image: "/news/news_triphala.png"
                },
                {
                    headline: "Amla: The Vitamin C Powerhouse of the Subcontinent",
                    summary: "Indian Gooseberry continues to outperform exotic superfoods in antioxidant tests, with 20 times more Vitamin C than oranges per gram.",
                    category: "superfoods",
                    source: "Nutritional Excellence",
                    image: "/news/news_amla.png"
                },
                {
                    headline: "Ashwagandha's Effect on Cortisol: What the Latest Data Shows",
                    summary: "A large-scale meta-analysis confirms that Ashwagandha roots significantly reduce serum cortisol levels, proving its role as a potent adaptogen for mental clarity.",
                    category: "nutrition-science",
                    source: "Science of Stress",
                    image: "/news/news_ashwagandha.png"
                },
                {
                    headline: "The Rise of Plant-Based Proteins in Indian Urban Centers",
                    summary: "Data suggests a 40% increase in the consumption of pulse-based proteins among young professionals in Chennai and Bangalore looking for clean labels.",
                    category: "wellness",
                    source: "Urban Health Trends",
                    image: "/news/news_pulses.png"
                },
                {
                    headline: "Bitter Gourd Charantin: New Hope for Natural Insulin Regulation",
                    summary: "Researchers have successfully isolated charantin from fresh bitter gourd, showing it mimics insulin activity more closely than previously understood.",
                    category: "nutrition-science",
                    source: "Endocrinology Lab",
                    image: "/news/news_bittergourd.png"
                },
                {
                    headline: "The Sustainability of Home-Grown Kitchen Pharmacies",
                    summary: "Increasing numbers of households in Tamil Nadu are cultivating Tulsi, Aloe Vera, and Mint, reducing reliance on over-the-counter anti-inflammatory drugs.",
                    category: "wellness",
                    source: "Eco-Nutrition Journal",
                    image: "/news/news_aloevera.png"
                },
                {
                    headline: "Government Policy Shifts Towards Bio-Fortified Crops in India",
                    summary: "New agricultural policies are prioritizing the distribution of zinc and iron-fortified rice varieties to combat hidden hunger in rural communities.",
                    category: "policy",
                    source: "Agri-Herald",
                    image: "/news/news_biofortified.png"
                },
                {
                    headline: "Black Seed Oil: The 'Cure for All' Gains Clinical Backing",
                    summary: "Nigella Sativa (Karunjeeragam) is undergoing massive clinical trials for its remarkable ability to lower blood pressure and improve respiratory function.",
                    category: "medicinal-plants",
                    source: "PharmaNature Watch",
                    image: "/news/news_blackseed.png"
                },
                {
                    headline: "Fenugreek: A Natural Secret to Healthy Cholesterol Levels",
                    summary: "Study reveals that the high fiber content (galactomannan) in fenugreek seeds plays a crucial role in lowering bad cholesterol (LDL) naturally.",
                    category: "superfoods",
                    source: "Natural Heart Care",
                    image: "/news/news_fenugreek.png"
                },
                {
                    headline: "Digital Nutrition: How AI Apps are Reshaping Personal Wellness",
                    summary: "The adoption of personalized nutrition tracking, specifically focused on local diets, has led to a 25% improvement in meal adherence in recent surveys.",
                    category: "wellness",
                    source: "Tech-Health Monitor",
                    image: "/news/news_digital_nutrition.png"
                }
            ]
        });
    }
});


/**
 * POST /api/ai/symptom-remedy
 * Body: { symptom: "I feel bloated after meals" }
 */
router.post('/symptom-remedy', async (req, res) => {
    try {
        const { symptom } = req.body;

        if (!symptom || typeof symptom !== 'string' || symptom.trim().length === 0) {
            return res.status(400).json({ error: 'Please provide a symptom description.' });
        }

        const sanitized = symptom.replace(/[<>{}]/g, '').trim().slice(0, 300);

        if (sanitized.length < 3) {
            return res.status(400).json({ error: 'Symptom description is too short.' });
        }

        const userPrompt = `The user is experiencing the following health symptom or concern: "${sanitized}"\n\nProvide Tamil Nadu-specific food remedies, herbs, lifestyle tips, and a clear when-to-see-a-doctor warning for this symptom.`;

        const parsed = await callLLM(SYMPTOM_REMEDY_PROMPT, userPrompt, { temperature: 0.4, maxTokens: 4096 });

        if (!parsed.symptom_understood || !parsed.foods_to_eat || !parsed.herbs_and_remedies) {
            return res.status(500).json({ error: 'AI response did not contain the expected remedy data.' });
        }

        res.json(parsed);
    } catch (err) {
        console.error('Symptom remedy error:', err);
        res.status(500).json({ error: err.message || 'Failed to get remedy suggestions. Please try again.' });
    }
});


/**
 * POST /api/ai/grocery-list
 * Body: { sevenDayPlan: [...] } — the seven_day_plan array from /api/ai/meal-plan
 */
router.post('/grocery-list', async (req, res) => {
    try {
        const { sevenDayPlan } = req.body;

        if (!sevenDayPlan || !Array.isArray(sevenDayPlan) || sevenDayPlan.length === 0) {
            return res.status(400).json({ error: 'Please provide the sevenDayPlan array.' });
        }

        // Build a compact summary of all meal descriptions across 7 days to keep token usage low
        const mealSummary = sevenDayPlan.map(day => {
            const dayLabel = day.day_name || `Day ${day.day_number}`;
            const meals = (day.meals || []).map(m => m.description).join('; ');
            return `${dayLabel}: ${meals}`;
        }).join('\n');

        const userPrompt = `Here is a 7-day Tamil Nadu meal plan. Extract all ingredients needed and return a categorized weekly grocery list:\n\n${mealSummary}`;

        const parsed = await callLLM(GROCERY_LIST_PROMPT, userPrompt, { temperature: 0.3, maxTokens: 2500 });

        if (!parsed.categories || !Array.isArray(parsed.categories) || parsed.categories.length === 0) {
            return res.status(500).json({ error: 'AI response did not contain a valid grocery list.' });
        }

        res.json(parsed);
    } catch (err) {
        console.error('Grocery list error:', err);
        res.status(500).json({ error: err.message || 'Failed to generate grocery list. Please try again.' });
    }
});


/**
 * POST /api/ai/dosha-analyzer
 * Body: { quizAnswers: { q1: 'answer', q2: 'answer', ... } }
 */
router.post('/dosha-analyzer', async (req, res) => {
    try {
        const { quizAnswers } = req.body;

        if (!quizAnswers || typeof quizAnswers !== 'object' || Object.keys(quizAnswers).length === 0) {
            return res.status(400).json({ error: 'Please provide your quiz answers.' });
        }

        // Format answers into a readable string for the LLM
        const answerText = Object.entries(quizAnswers)
            .map(([q, a]) => `${q}: ${a}`)
            .join('\n');

        const userPrompt = `Here are my quiz answers about my body and lifestyle. Please analyze my dosha:\n\n${answerText}`;

        const parsed = await callLLM(DOSHA_ANALYZER_PROMPT, userPrompt, { temperature: 0.4, maxTokens: 4096 });

        if (!parsed.primary_dosha || !parsed.foods_to_favor) {
            return res.status(500).json({ error: 'AI response did not contain a valid dosha analysis.' });
        }

        res.json(parsed);
    } catch (err) {
        console.error('Dosha analyzer error:', err);
        res.status(500).json({ error: err.message || 'Failed to analyze dosha. Please try again.' });
    }
});


/**
 * POST /api/ai/food-log-summary
 * Body: { entries: [{ time, meal, description }], targetCalories? }
 */
router.post('/food-log-summary', async (req, res) => {
    try {
        const { entries, targetCalories } = req.body;

        if (!entries || !Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: 'Please provide at least one food log entry.' });
        }

        const logText = entries.map(e => `${e.time || ''} — ${e.meal}: ${e.description || e.meal}`).join('\n');
        const targetNote = targetCalories ? `\nUser's daily calorie target: ${targetCalories} kcal.` : '';

        const userPrompt = `Here are today's food entries:\n\n${logText}${targetNote}\n\nPlease analyze this and return the nutritional summary.`;

        const parsed = await callLLM(FOOD_LOG_SUMMARY_PROMPT, userPrompt, { temperature: 0.3, maxTokens: 1200 });

        if (!parsed.estimated_totals || !parsed.tips) {
            return res.status(500).json({ error: 'AI response did not contain a valid food log summary.' });
        }

        res.json(parsed);
    } catch (err) {
        console.error('Food log summary error:', err);
        res.status(500).json({ error: err.message || 'Failed to generate food log summary.' });
    }
});

/**
 * POST /api/ai/hydration-advisor
 * Body: { weight, age, activityLevel, climate, healthGoal, season? }
 */
router.post('/hydration-advisor', async (req, res) => {
    try {
        const { weight, age, activityLevel, climate, healthGoal, season } = req.body;

        if (!weight || !age || !activityLevel) {
            return res.status(400).json({ error: 'Please provide weight, age, and activity level.' });
        }

        const userPrompt = `My profile:\n- Weight: ${weight}kg\n- Age: ${age} years\n- Activity Level: ${activityLevel}\n- Climate / Location: ${climate || 'Tamil Nadu, South India'}\n- Season: ${season || 'Summer (March-June)'}\n- Health Goal: ${healthGoal || 'General wellness'}\n\nPlease calculate my optimal daily water intake and give supplement recommendations.`;

        const parsed = await callLLM(HYDRATION_ADVISOR_PROMPT, userPrompt, { temperature: 0.4, maxTokens: 1800 });

        if (!parsed.daily_water_ml || !parsed.supplements) {
            return res.status(500).json({ error: 'AI response did not contain valid hydration advice.' });
        }

        res.json(parsed);
    } catch (err) {
        console.error('Hydration advisor error:', err);
        if (err.message.includes('401') || err.message.includes('key') || err.message.includes('fetch') || err.message.includes('parse')) {
            console.log('Serving fallback hydration advice due to auth or API error.');
            return res.json({
                daily_water_ml: (req.body.weight || 70) * 35,
                daily_water_glasses: Math.round(((req.body.weight || 70) * 35) / 250),
                calculation_basis: "Fallback calculation: weight-based at 35ml/kg.",
                hydration_schedule: [
                    { time: "On waking (6-7 AM)", amount: "400ml", tip: "Start with warm water — flushes toxins as per Siddha tradition" },
                    { time: "Before breakfast", amount: "250ml", tip: "Prepares digestive system" },
                    { time: "Mid-morning", amount: "500ml", tip: "Maintains energy" },
                    { time: "Afternoon", amount: "500ml", tip: "Prevents afternoon slump" }
                ],
                tn_hydration_drinks: [
                    { name: "Nannari Sherbet", benefit: "Cooling, reduces body heat (pitta), excellent for Tamil Nadu summers", when: "Afternoon 3-4 PM" },
                    { name: "Neer Mor (Spiced Buttermilk)", benefit: "Probiotic, restores electrolytes", when: "Mid-day" }
                ],
                supplements: [
                    {
                        name: "Sabja Seeds (Basil Seeds)",
                        tamil_name: "Sabja Vithai",
                        benefit: "Cools the body, aids digestion, high in fiber",
                        how_to_use: "Soak 1 tsp in 200ml water for 15 minutes, drink daily",
                        best_for: "Weight management, digestion, body heat"
                    }
                ],
                dehydration_warnings: ["Dark yellow urine", "Headaches by mid-afternoon", "Dry lips and mouth"],
                seasonal_note: "Remember to increase water intake by 500ml if you sweat heavily."
            });
        }
        res.status(500).json({ error: err.message || 'Failed to generate hydration advice.' });
    }
});

export default router;





