import { supabase } from '../../config/supabase';
import { logger } from '../utils/logger';
import type { SellerCharge, ChargeResponse } from './types';

export async function processSubscriptionCharge(
  orderId: string, 
  paymentIntentId: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc('process_subscription_charge', {
      p_order_id: orderId,
      p_payment_intent_id: paymentIntentId,
      p_amount: 1000 // $10.00 in cents
    });

    if (error) {
      // If duplicate charge, treat as success
      if (error.code === '23505') {
        logger.info('Subscription charge already processed:', {
          orderId,
          paymentIntentId
        });
        return;
      }
      throw error;
    }

    logger.info('Successfully processed subscription charge:', {
      orderId,
      paymentIntentId
    });
  } catch (err) {
    logger.error('Error processing subscription charge:', err);
    throw new Error('Failed to process subscription charge');
  }
}

export async function getSellerCharges(sellerId: string): Promise<SellerCharge[]> {
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