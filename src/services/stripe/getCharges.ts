import { supabase } from '../../config/supabase';
import { logger } from '../utils/logger';

interface Charge {
  payment_intent_id: string;
  order_id: string;
  amount: number;
  status: string;
  created_at: string;
}

export async function getSellerCharges(sellerId: string): Promise<Charge[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_seller_charges', { p_seller_id: sellerId });

    if (error) throw error;

    logger.info('Retrieved seller charges:', { 
      sellerId, 
      count: data?.length 
    });

    return data || [];
  } catch (err) {
    logger.error('Error getting seller charges:', err);
    throw new Error('Failed to get seller charges');
  }
}