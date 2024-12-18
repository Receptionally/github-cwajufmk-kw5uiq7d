import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { supabase } from './utils/supabase';
import { logger } from './utils/logger';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUBSCRIPTION_FEE = 1000; // $10 in cents

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
    const { sellerId, orderId } = JSON.parse(event.body || '{}');

    logger.info('Processing seller subscription charge:', { sellerId, orderId });

    // Get seller info with payment details
    const { data: seller } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', sellerId)
      .single();

    if (!seller) throw new Error('Seller not found');
    if (!seller.stripe_customer_id) throw new Error('Seller has no payment method set up');

    // Get customer's default payment method
    const customer = await stripe.customers.retrieve(seller.stripe_customer_id);
    if (!customer || customer.deleted) {
      throw new Error('Customer not found');
    }

    const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;
    if (!defaultPaymentMethod) {
      throw new Error('No default payment method found for customer');
    }

    // Create and confirm payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: SUBSCRIPTION_FEE,
      currency: 'usd',
      customer: seller.stripe_customer_id,
      payment_method: defaultPaymentMethod as string,
      description: `Subscription fee for order ${orderId.slice(0, 8)}`,
      off_session: true,
      confirm: true,
      payment_method_types: ['card'],
      metadata: {
        seller_id: sellerId,
        order_id: orderId,
        type: 'subscription_charge'
      }
    });

    logger.info('Successfully created payment intent:', {
      paymentIntentId: paymentIntent.id,
      amount: SUBSCRIPTION_FEE,
      sellerId
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        paymentIntentId: paymentIntent.id
      }),
    };
  } catch (err) {
    logger.error('Error charging seller:', err);
    
    // Record failed charge if it's a payment error
    if (err instanceof Stripe.errors.StripeError) {
      try {
        await supabase.rpc('record_failed_charge', {
          p_seller_id: JSON.parse(event.body || '{}').sellerId,
          p_amount: SUBSCRIPTION_FEE / 100 // Convert cents to dollars
        });
      } catch (rpcError) {
        logger.error('Error recording failed charge:', rpcError);
      }
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Failed to charge seller'
      }),
    };
  }
};