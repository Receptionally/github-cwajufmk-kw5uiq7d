import { supabase } from '../../../config/supabase';
import { logger } from '../../utils/logger';
import type { PaymentIntent } from './types';

export async function getPaymentIntent(orderId: string): Promise<PaymentIntent | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_payment_intent', { p_order_id: orderId });

    if (error) {
      logger.error('Error getting payment intent:', error);
      return null;
    }

    return data;
  } catch (err) {
    logger.error('Error getting payment intent:', err);
    return null;
  }
}