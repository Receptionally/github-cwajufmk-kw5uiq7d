import { supabase } from '../../../config/supabase';
import { logger } from '../../utils/logger';

export async function updateOrderChargeStatus(orderId: string, charged: boolean) {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ subscription_charge_processed: charged })
      .eq('id', orderId);

    if (error) throw error;
    logger.info('Updated order charge status:', { orderId, charged });
  } catch (err) {
    logger.error('Error updating order charge status:', err);
    throw err;
  }
}