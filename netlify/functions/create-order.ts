import { Handler } from '@netlify/functions';
import { createCustomer } from './services/customer';
import { supabase } from './utils/supabase';
import { logger } from './utils/logger';

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
    if (!event.body) {
      throw new Error('Missing request body');
    }

    const { 
      customerName, 
      email, 
      phone, 
      address, 
      paymentMethod, 
      stripeAccountId,
      productName,
      quantity,
      totalAmount,
      sellerId
    } = JSON.parse(event.body);

    // Validate required fields
    if (!customerName || !email || !paymentMethod || !stripeAccountId || !sellerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    logger.info('Creating customer and order:', {
      customerName,
      email,
      productName,
      sellerId,
      stripeAccountId,
      totalAmount
    });

    // Create customer in Stripe
    const customer = await createCustomer({
      name: customerName,
      email,
      phone,
      address,
      paymentMethod,
      stripeAccountId,
    });

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        seller_id: sellerId,
        customer_name: customerName,
        customer_email: email,
        product_name: productName,
        quantity,
        total_amount: totalAmount,
        stripe_customer_id: customer.id,
        stripe_account_id: stripeAccountId,
        stripe_payment_status: 'pending',
        status: 'pending'
      }])
      .select()
      .single();

    if (orderError) {
      logger.error('Error creating order:', orderError);
      throw new Error('Failed to create order');
    }

    // Get seller info to check subscription status
    const { data: seller } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', sellerId)
      .single();

    if (!seller) {
      throw new Error('Seller not found');
    }

    // Check if seller needs to be charged for subscription (4th order and beyond)
    if (seller.total_orders >= 3) {
      // Charge seller $10 subscription fee
      try {
        await fetch('/.netlify/functions/charge-seller', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sellerId: seller.id,
            orderId: order.id
          }),
        });
      } catch (err) {
        // Log error but continue with order
        logger.error('Failed to charge seller subscription:', err);
      }
    }

    logger.info('Successfully created order:', { orderId: order.id });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        customerId: customer.id,
        orderId: order.id
      }),
    };
  } catch (err) {
    logger.error('Error in create-order handler:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Failed to create order'
      }),
    };
  }
};