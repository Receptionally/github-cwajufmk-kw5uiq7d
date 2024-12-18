import { processSubscriptionCharge } from './payment-intents';
import { logger } from '../utils/logger';

export async function chargeSeller(sellerId: string, orderId: string): Promise<void> {
  try {
    // Process the charge with Stripe via Netlify function
    const response = await fetch('/.netlify/functions/charge-seller', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sellerId,
        orderId
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to charge seller');
    }

    // Record the charge in the database
    await processSubscriptionCharge(orderId, data.paymentIntentId);

    logger.info('Successfully charged seller:', { 
      sellerId, 
      orderId,
      paymentIntentId: data.paymentIntentId
    });
  } catch (err) {
    logger.error('Error charging seller:', err);
    throw err;
  }
}