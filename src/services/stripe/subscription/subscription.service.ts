import { supabase } from '../../../config/supabase';
import { logger } from '../../utils/logger';
import { SubscriptionChargeError, SUBSCRIPTION_ERRORS } from './subscription.errors';
import type { SubscriptionCharge, SubscriptionChargeResult, PaymentStatus } from './types';

export async function getPaymentStatus(orderId: string): Promise<PaymentStatus> {
  try {
    const { data, error } = await supabase
      .rpc('check_order_payment_status', { p_order_id: orderId });

    if (error) throw error;

    return {
      isCharged: data.is_charged || false,
      paymentIntentId: data.payment_intent_id,
      amount: data.amount,
      processedAt: data.created_at
    };
  } catch (err) {
    logger.error('Error getting payment status:', err);
    throw new SubscriptionChargeError(SUBSCRIPTION_ERRORS.INVALID_ORDER);
  }
}

export async function processSubscriptionCharge(charge: SubscriptionCharge): Promise<SubscriptionChargeResult> {
  try {
    // Check if already charged
    const status = await getPaymentStatus(charge.orderId);
    if (status.isCharged) {
      return { success: true };
    }

    // Process charge
    const { data, error } = await supabase
      .rpc('handle_subscription_charge', {
        p_order_id: charge.orderId,
        p_payment_intent_id: charge.paymentIntentId,
        p_amount: charge.amount
      });

    if (error) throw error;

    return {
      success: data.success,
      error: data.error,
      chargeId: data.charge_id
    };
  } catch (err) {
    logger.error('Error processing subscription charge:', err);
    throw new SubscriptionChargeError(
      err instanceof Error ? err.message : SUBSCRIPTION_ERRORS.CHARGE_FAILED
    );
  }
}