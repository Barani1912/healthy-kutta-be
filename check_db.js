import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
    console.log('Checking saved_food_comparisons table...');

    // 1. Try Select
    const { data: selectData, error: selectError } = await supabase
        .from('saved_food_comparisons')
        .select('*')
        .limit(1);

    if (selectError) {
        console.error('Table select error:', selectError);
    } else {
        console.log('Table exists and is readable. Data sample:', selectData);
    }

    // 2. Try Insert (Anon)
    console.log('Testing insert (Anon)...');
    const { data: insertData, error: insertError } = await supabase
        .from('saved_food_comparisons')
        .insert({
            user_id: 'd8c4c3e0-0000-0000-0000-000000000000', // Dummy UUID
            selected_foods: ['Apple'],
            result_data: { test: true }
        });

    if (insertError) {
        console.error('Insert error (Anon):', insertError);
    } else {
        console.log('Insert success (Anon)! Data:', insertData);
    }
}

checkTable();
