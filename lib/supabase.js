import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables.');
}

// Default client (for auth operations)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Create a Supabase client scoped to a specific user's JWT token.
 * This ensures RLS policies are enforced per-user.
 */
export function createUserClient(accessToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    });
}
