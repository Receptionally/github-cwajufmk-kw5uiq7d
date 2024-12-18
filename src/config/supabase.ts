import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';
import { logger } from '../services/utils/logger';

if (!ENV?.supabase?.url || !ENV?.supabase?.anonKey) {
  logger.error('Missing required Supabase configuration');
  throw new Error('Missing required Supabase configuration');
}

// Initialize Supabase client with proper configuration
export const supabase = createClient(ENV.supabase.url, ENV.supabase.anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  },
  global: {
    headers: {
      'apikey': ENV.supabase.anonKey,
      'Authorization': `Bearer ${ENV.supabase.anonKey}`
    }
  },
  db: {
    schema: 'public'
  }
});

// Test database connection and log result
export async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('count');

    if (error) throw error;
    logger.info('✓ Supabase connection successful');
    return true;
  } catch (err) {
    logger.error('❌ Supabase connection error:', err);
    return false;
  }
}

// Clear Supabase cache
export async function clearSupabaseCache() {
  try {
    await supabase.rpc('reload_schema');
    logger.info('✓ Supabase cache cleared');
  } catch (err) {
    logger.error('❌ Failed to clear Supabase cache:', err);
  }
}

// Initialize connection test and clear cache
testDatabaseConnection().then(() => clearSupabaseCache());