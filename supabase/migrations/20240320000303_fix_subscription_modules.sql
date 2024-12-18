-- First drop existing functions
drop function if exists process_subscription_charge cascade;
drop function if exists get_payment_intent cascade;

-- Create function to get payment intent status
create function get_payment_intent_status(
  p_order_id uuid
) returns jsonb as $$
begin
  return (
    select jsonb_build_object(
      'id', pi.id,
      'status', pi.status,
      'amount', pi.amount,
      'created_at', pi.created_at
    )
    from payment_intents pi
    where pi.order_id = p_order_id
    and pi.type = 'subscription_charge'
    and pi.status = 'succeeded'
    limit 1
  );
end;
$$ language plpgsql security definer;

-- Create function to check if order is charged
create function is_order_charged(
  p_order_id uuid
) returns boolean as $$
begin
  return exists (
    select 1
    from payment_intents
    where order_id = p_order_id
    and type = 'subscription_charge'
    and status = 'succeeded'
  );
end;
$$ language plpgsql security definer;

-- Create function to record payment intent
create function record_payment_intent(
  p_seller_id uuid,
  p_order_id uuid,
  p_payment_intent_id text,
  p_amount integer
) returns void as $$
begin
  insert into payment_intents (
    seller_id,
    order_id,
    stripe_payment_intent_id,
    amount,
    status,
    type
  ) values (
    p_seller_id,
    p_order_id,
    p_payment_intent_id,
    p_amount,
    'succeeded',
    'subscription_charge'
  )
  on conflict (order_id, type) do nothing;
end;
$$ language plpgsql security definer;

-- Create function to mark order as charged
create function mark_order_charged(
  p_order_id uuid
) returns void as $$
begin
  update orders
  set subscription_charge_processed = true
  where id = p_order_id;
end;
$$ language plpgsql security definer;

-- Create main process subscription charge function
create function process_subscription_charge(
  p_order_id uuid,
  p_payment_intent_id text,
  p_amount integer default 1000
) returns jsonb as $$
declare
  v_order_record record;
  v_lock_obtained boolean;
begin
  -- Try to obtain advisory lock
  select pg_try_advisory_xact_lock(hashtext(p_order_id::text)) into v_lock_obtained;
  
  if not v_lock_obtained then
    return jsonb_build_object(
      'success', false,
      'error', 'Could not obtain lock for order processing'
    );
  end if;

  -- Get order with lock
  select * into v_order_record
  from orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Order not found'
    );
  end if;

  -- Check if already processed
  if v_order_record.subscription_charge_processed then
    return jsonb_build_object(
      'success', true,
      'message', 'Order already processed'
    );
  end if;

  -- Process charge
  begin
    -- Record payment intent
    perform record_payment_intent(
      v_order_record.seller_id,
      p_order_id,
      p_payment_intent_id,
      p_amount
    );

    -- Mark order as charged
    perform mark_order_charged(p_order_id);

    return jsonb_build_object(
      'success', true,
      'message', 'Charge processed successfully'
    );
  exception when others then
    return jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  end;
end;
$$ language plpgsql security definer;

-- Create indexes for better performance
create index if not exists idx_payment_intents_lookup 
  on payment_intents (order_id, type, status)
  where type = 'subscription_charge';

create index if not exists idx_orders_charge_status
  on orders (id, subscription_charge_processed);

-- Grant permissions
grant execute on function get_payment_intent_status to authenticated;
grant execute on function is_order_charged to authenticated;
grant execute on function process_subscription_charge to authenticated;

-- Force schema cache refresh
notify pgrst, 'reload schema';