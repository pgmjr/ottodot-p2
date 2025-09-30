/**
 * Supabase Client (MOCK VERSION)
 *
 * This file exports a mock Supabase client for the code review exercise.
 * In production, this connects to a real Supabase PostgreSQL database.
 */

import { mockSupabase } from '../mocks/mockDatabase';

// Export mock client as if it were the real Supabase client
export const supabase = mockSupabase as any;
