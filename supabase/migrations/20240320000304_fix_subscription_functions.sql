-- Drop existing functions first
drop function if exists process_subscription_charge cascade;
drop function if exists get_payment_intent cascade;
drop function if exists is_order_charged cascade;
drop function if exists get_payment_intent_status cascade;
drop function if exists record_payment_intent cascade;
drop function if exists mark_order_charged cascade;

-- Create function to check payment status
create function check_order_payment_status(
  p_order_id uuid
) returns jsonb as $$
begin
  return (
    select jsonb_build_object(
      'id', pi.id,
      'status', pi.status,
      'amount', pi.amount,
      'created_at', pi.created_at,
      'is_charged', o.subscription_charge_processed
    )
    from orders o
    left join payment_intents pi on pi.order_id = o.id 
      and pi.type = 'subscription_charge'
      and pi.status = 'succeeded'
    where o.id = p_order_id
  );
end;
$$ language plpgsql security definer;

-- Create function to record subscription payment
create function record_subscription_payment(
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

-- Create function to update order status
create function update_order_payment_status(
  p_order_id uuid,
  p_processed boolean
) returns void as $$
begin
  update orders
  set subscription_charge_processed = p_processed
  where id = p_order_id;
end;
$$ language plpgsql security definer;

-- Create main subscription charge function
create function handle_subscription_charge(
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
    -- Record payment first
    perform record_subscription_payment(
      v_order_record.seller_id,
      p_order_id,
      p_payment_intent_id,
      p_amount
    );

    -- Then update order status
    perform update_order_payment_status(p_order_id, true);

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
grant execute on function check_order_payment_status to authenticated;
grant execute on function handle_subscription_charge to authenticated;

-- Force schema cache refresh
notify pgrst, 'reload schema';