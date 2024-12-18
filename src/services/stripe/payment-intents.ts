import { supabase } from '../../config/supabase';
import { logger } from '../utils/logger';

interface PaymentIntent {
  id: string;
  status: string;
  amount: number;
  created_at: string;
}

export async function getPaymentIntent(orderId: string): Promise<PaymentIntent | null> {
  try {
    const { data, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('order_id', orderId)
      .eq('type', 'subscription_charge')
      .single();

    if (error) throw error;

    return data;
  } catch (err) {
    logger.error('Error getting payment intent:', err);
    return null;
  }
}

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

    if (error) throw error;

    logger.info('Successfully processed subscription charge:', {
      orderId,
      paymentIntentId
    });
  } catch (err) {
    logger.error('Error processing subscription charge:', err);
    throw new Error('Failed to process subscription charge');
  }
}