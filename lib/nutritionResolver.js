import ifct2017 from 'ifct2017';
import { supabase } from './supabase.js';

// Pre-load ifct2017 data
let ifctLoaded = false;
async function ensureIfctLoaded() {
    if (!ifctLoaded) {
        await ifct2017.compositions.load();
        ifctLoaded = true;
    }
}

/**
 * Standardize nutrition data across sources
 */
function standardizeNutrition(source, rawData) {
    if (source === 'ifct2017') {
        return {
            calories: Math.round(rawData.enerc / 4.184), // Convert kJ to kcal
            protein: rawData.protcnt || 0,
            carbs: rawData.choavldf || 0,
            fats: rawData.fatce || 0,
            fiber: rawData.fibtg || 0
        };
    } else if (source === 'indb') {
        return {
            calories: rawData.calories_kcal || 0,
            protein: rawData.protein_g || 0,
            carbs: rawData.carbs_g || 0,
            fats: rawData.fat_g || 0,
            fiber: rawData.fiber_g || 0
        };
    }
    return rawData;
}

/**
 * Resolves nutrition data for multiple food items using a 3-tier fallback.
 * @param {string[]} foodNames 
 * @param {Function} apiCallFn - Function that calls the primary API
 * @returns {Promise<object>}
 */
export async function resolveNutritionData(foodNames, apiCallFn) {
    try {
        // Tier 1: Primary API
        console.log('[Resolver] Tier 1: Calling primary API for:', foodNames);
        const apiResponse = await apiCallFn(foodNames);
        return {
            source: 'api',
            ...apiResponse,
            fallbackNote: null
        };
    } catch (apiErr) {
        console.warn('[Resolver] Tier 1 failed:', apiErr.message);

        const results = {
            source: 'multiple', // Could be mixed if we did per-item, but instructions say single function response
            items: [],
            combination_analysis: null,
            fallbackNote: 'Combination compatibility analysis is not available at this moment and will be available shortly.'
        };

        let allNotFound = true;

        for (const foodName of foodNames) {
            let itemData = null;
            let foundSource = 'not_found';

            // Tier 2: ifct2017
            try {
                await ensureIfctLoaded();
                const ifctResults = ifct2017.compositions(foodName);
                if (ifctResults && ifctResults.length > 0) {
                    itemData = {
                        name: ifctResults[0].name,
                        nutrition_per_100g: standardizeNutrition('ifct2017', ifctResults[0]),
                        health_benefits: [], // Not available in IFCT
                        optimal_timing: { best_time: "anytime", reasoning: "Data from Indian Food Composition Tables." },
                        preparation_guidelines: { dos: [], donts: [] },
                        health_warnings: []
                    };
                    foundSource = 'ifct2017';
                    allNotFound = false;
                }
            } catch (ifctErr) {
                console.error('[Resolver] Tier 2 error:', ifctErr);
            }

            // Tier 3: Supabase INDB
            if (!itemData) {
                try {
                    const { data: indbData, error: indbError } = await supabase
                        .from('indb_foods')
                        .select('*')
                        .ilike('food_name', `%${foodName}%`)
                        .limit(1)
                        .maybeSingle();

                    if (!indbError && indbData) {
                        itemData = {
                            name: indbData.food_name,
                            nutrition_per_100g: standardizeNutrition('indb', indbData),
                            health_benefits: [],
                            optimal_timing: { best_time: "anytime", reasoning: "Data from Indian Nutrient Databank." },
                            preparation_guidelines: { dos: [], donts: [] },
                            health_warnings: []
                        };
                        foundSource = 'indb';
                        allNotFound = false;
                    }
                } catch (indbErr) {
                    console.error('[Resolver] Tier 3 error:', indbErr);
                }
            }

            if (itemData) {
                results.items.push(itemData);
                results.source = foundSource; // Simplified: last found source or 'multiple'
            }
        }

        if (allNotFound) {
            return {
                source: 'not_found',
                error: "We couldn't find nutrition data for this item right now. This may be a very specific or regional food. Please try again in a moment or search with a different spelling."
            };
        }

        return results;
    }
}
