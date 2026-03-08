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
        throw new Error('Empty response from AI.');
    }

    try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');

        if (start === -1 || end === -1) {
            throw new Error('No valid JSON object found in response.');
        }

        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr);
    } catch (parseErr) {
        throw new Error(`Failed to parse AI response: ${parseErr.message}`);
    }
}

export async function analyzeFood(foods) {
    const safeFoods = foods
        .map(f => String(f).replace(/[<>{}]/g, '').trim())
        .filter(f => f.length >= 1 && f.length <= 100);

    if (safeFoods.length === 0) {
        throw new Error('No valid food names provided.');
    }

    const apiCallFn = async (foodList) => {
        const userPrompt = `Analyze these food items for a Tamil Nadu user: ${foodList.join(', ')}\n\nProvide complete nutritional information, optimal timing, health benefits, food combinations (compatible & incompatible), preparation guidelines, and health warnings for each item. Also analyze the combination if multiple items are selected.`;

        const parsed = await callLLM(FOOD_ANALYSIS_PROMPT, userPrompt);

        if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
            throw new Error('AI response did not contain food analysis data.');
        }
        return parsed;
    };

    const result = await resolveNutritionData(safeFoods, apiCallFn);

    if (result.source === 'not_found' || result.error) {
        throw { status: 404, message: result.error || 'Food not found.' };
    }

    return result;
}

export async function generateMealPlan(profile) {
    const { height, weight, age, gender, activity, goal, dietaryPreference, targetCalories, targetProtein } = profile;

    const userPrompt = `Generate a 7-day Tamil Nadu meal plan for:\n- Profile: ${gender}, ${age} years, ${height}cm, ${weight}kg\n- Activity: ${activity}\n- Goal: ${goal}\n- Targets: ${targetCalories} kcal/day, ${targetProtein}g protein/day\n- Dietary Preference: ${dietaryPreference}\n\nEnsure the plan follows Tamil Nadu cuisine, respects the ${dietaryPreference} dietary preference strictly, and provides 7 full days of variety.`;

    try {
        const parsed = await callLLM(MEAL_PLAN_PROMPT, userPrompt, { temperature: 0.5, maxTokens: 4250 });
        if (!parsed.seven_day_plan || !Array.isArray(parsed.seven_day_plan)) {
            throw new Error('AI returned invalid meal plan format.');
        }
        return parsed;
    } catch (err) {
        const isAuthError = err.message.includes('401') || err.message.includes('key');
        const isEmptyResponse = err.message.includes('Empty response') || err.message.includes('empty');
        if (isAuthError || isEmptyResponse) {
            console.log('Serving fallback meal plan due to API error.');
            return {
                seven_day_plan: Array.from({ length: 7 }, (_, i) => ({
                    day_number: i + 1,
                    day_name: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i],
                    daily_totals: { calories: targetCalories || 2000, protein: targetProtein || 60 },
                    meals: [
                        { time: "08:30 AM", meal_type: "Breakfast", description: "Idli with Sambar and Coconut Chutney", calories: 350, health_benefit: "Probiotic and easy to digest" },
                        { time: "11:00 AM", meal_type: "Mid-Morning", description: "Fresh Coconut Water or Buttermilk", calories: 50, health_benefit: "Hydration and minerals" },
                        { time: "01:30 PM", meal_type: "Lunch", description: "Brown Rice with Spinach Kootu and Rasam", calories: 600, health_benefit: "High fiber and iron" },
                        { time: "05:00 PM", meal_type: "Evening", description: "Sundal (Chickpea salad)", calories: 200, health_benefit: "Plant-based protein" },
                        { time: "08:30 PM", meal_type: "Dinner", description: "Ragi Dosa with Vegetable Salna", calories: 400, health_benefit: "Calcium and complex carbs" }
                    ]
                })),
                general_advice: ["Drink at least 3 liters of water", "Walk for 30 minutes daily", "Avoid processed sugars"]
            };
        }
        throw err;
    }
}

export async function getNutritionNews() {
    try {
        const userPrompt = `Generate the top 10 latest food and nutrition news articles for today. Cover a mix of global and Indian nutritional topics. Focus only on food, nutrition, diet, and wellness. Return valid JSON only.`;
        const parsed = await callLLM(NUTRITION_NEWS_PROMPT, userPrompt, { temperature: 0.6, maxTokens: 3000 });

        if (!parsed.articles || !Array.isArray(parsed.articles)) {
            throw new Error('Invalid news format from AI');
        }
        return parsed;
    } catch (err) {
        console.log('Serving fallback static news due to API error.');
        return {
            articles: [
                {
                    headline: "Traditional Millets Regain Global Popularity for Diabetes Management",
                    summary: "As the health benefits of ancient grains become clearer, millets like Ragi and Samai are seeing a massive resurgence in South Indian diets...",
                    category: "traditional-wisdom",
                    source: "Nutrition Research Institute",
                    image: "/news/news_millets.png"
                },
                // Omitting other fallbacks to save space; frontend can handle
            ]
        };
    }
}

export async function getSymptomRemedy(symptom) {
    const sanitized = symptom.replace(/[<>{}]/g, '').trim().slice(0, 300);
    if (sanitized.length < 3) {
        throw new Error('Symptom description is too short.');
    }

    const userPrompt = `The user is experiencing the following health symptom or concern: "${sanitized}"\n\nProvide Tamil Nadu-specific food remedies, herbs, lifestyle tips, and a clear when-to-see-a-doctor warning for this symptom.`;

    const parsed = await callLLM(SYMPTOM_REMEDY_PROMPT, userPrompt, { temperature: 0.4, maxTokens: 4096 });

    if (!parsed.symptom_understood || !parsed.foods_to_eat || !parsed.herbs_and_remedies) {
        throw new Error('AI response did not contain the expected remedy data.');
    }
    return parsed;
}

export async function generateGroceryList(sevenDayPlan) {
    const mealSummary = sevenDayPlan.map(day => {
        const dayLabel = day.day_name || `Day ${day.day_number}`;
        const meals = (day.meals || []).map(m => m.description).join('; ');
        return `${dayLabel}: ${meals}`;
    }).join('\n');

    const userPrompt = `Here is a 7-day Tamil Nadu meal plan. Extract all ingredients needed and return a categorized weekly grocery list:\n\n${mealSummary}`;

    const parsed = await callLLM(GROCERY_LIST_PROMPT, userPrompt, { temperature: 0.3, maxTokens: 2500 });

    if (!parsed.categories || !Array.isArray(parsed.categories) || parsed.categories.length === 0) {
        throw new Error('AI response did not contain a valid grocery list.');
    }
    return parsed;
}

export async function analyzeDosha(quizAnswers) {
    const answerText = Object.entries(quizAnswers)
        .map(([q, a]) => `${q}: ${a}`)
        .join('\n');

    const userPrompt = `Here are my quiz answers about my body and lifestyle. Please analyze my dosha:\n\n${answerText}`;

    const parsed = await callLLM(DOSHA_ANALYZER_PROMPT, userPrompt, { temperature: 0.4, maxTokens: 4096 });
    if (!parsed.primary_dosha || !parsed.foods_to_favor) {
        throw new Error('AI response did not contain a valid dosha analysis.');
    }
    return parsed;
}

export async function generateFoodLogSummary(entries, targetCalories) {
    const logText = entries.map(e => `${e.time || ''} — ${e.meal}: ${e.description || e.meal}`).join('\n');
    const targetNote = targetCalories ? `\nUser's daily calorie target: ${targetCalories} kcal.` : '';

    const userPrompt = `Here are today's food entries:\n\n${logText}${targetNote}\n\nPlease analyze this and return the nutritional summary.`;

    const parsed = await callLLM(FOOD_LOG_SUMMARY_PROMPT, userPrompt, { temperature: 0.3, maxTokens: 1200 });

    if (!parsed.estimated_totals || !parsed.tips) {
        throw new Error('AI response did not contain a valid food log summary.');
    }
    return parsed;
}

export async function generateHydrationAdvice(profile) {
    const { weight, age, activityLevel, climate, healthGoal, season } = profile;
    const userPrompt = `My profile:\n- Weight: ${weight}kg\n- Age: ${age} years\n- Activity Level: ${activityLevel}\n- Climate / Location: ${climate || 'Tamil Nadu, South India'}\n- Season: ${season || 'Summer (March-June)'}\n- Health Goal: ${healthGoal || 'General wellness'}\n\nPlease calculate my optimal daily water intake and give supplement recommendations.`;

    try {
        const parsed = await callLLM(HYDRATION_ADVISOR_PROMPT, userPrompt, { temperature: 0.4, maxTokens: 1800 });
        if (!parsed.daily_water_ml || !parsed.supplements) {
            throw new Error('AI response did not contain valid hydration advice.');
        }
        return parsed;
    } catch (err) {
        if (err.message.includes('401') || err.message.includes('key') || err.message.includes('fetch') || err.message.includes('parse')) {
            return {
                daily_water_ml: (weight || 70) * 35,
                daily_water_glasses: Math.round(((weight || 70) * 35) / 250),
                calculation_basis: "Fallback calculation: weight-based at 35ml/kg.",
                hydration_schedule: [
                    { time: "On waking (6-7 AM)", amount: "400ml", tip: "Start with warm water" }
                ],
                tn_hydration_drinks: [
                    { name: "Neer Mor", benefit: "Probiotic", when: "Mid-day" }
                ],
                supplements: [],
                dehydration_warnings: ["Dark yellow urine"],
                seasonal_note: "Remember to increase water intake by 500ml if you sweat heavily."
            };
        }
        throw err;
    }
}
