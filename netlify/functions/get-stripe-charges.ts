import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { supabase } from './utils/supabase';
import { logger } from './utils/logger';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  throw new Error('Missing Stripe secret key');
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { sellerId } = JSON.parse(event.body || '{}');

    // Get seller's customer ID
    const { data: seller } = await supabase
      .from('sellers')
      .select('stripe_customer_id')
      .eq('id', sellerId)
      .single();

    if (!seller?.stripe_customer_id) {
      throw new Error('Seller has no Stripe customer ID');
    }

    // Get all charges for this customer
    const charges = await stripe.charges.list({
      customer: seller.stripe_customer_id,
      expand: ['data.metadata'],
      limit: 100, // Adjust as needed
    });

    // Filter for subscription charges only
    const subscriptionCharges = charges.data.filter(
      charge => charge.metadata?.type === 'subscription_charge'
    );

    logger.info('Retrieved subscription charges:', { 
      sellerId,
      count: subscriptionCharges.length 
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(subscriptionCharges),
    };
  } catch (err) {
    logger.error('Error fetching charges:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Failed to fetch charges'
      }),
    };
  }
};