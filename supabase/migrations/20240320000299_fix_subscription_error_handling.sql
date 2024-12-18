-- Drop existing functions
drop function if exists process_subscription_charge cascade;
drop function if exists get_payment_intent cascade;

-- Create improved function to get payment intent with better error handling
create or replace function get_payment_intent(
  p_order_id uuid
) returns table (
  id uuid,
  status text,
  amount integer,
  created_at timestamp with time zone
) as $$
begin
  return query
  select 
    pi.id,
    pi.status,
    pi.amount,
    pi.created_at
  from payment_intents pi
  where pi.order_id = p_order_id
  and pi.type = 'subscription_charge'
  and pi.status = 'succeeded'
  limit 1;
end;
$$ language plpgsql security definer;

-- Create improved function to process subscription charge with better error handling
create or replace function process_subscription_charge(
  p_order_id uuid,
  p_payment_intent_id text,
  p_amount integer default 1000
) returns jsonb as $$
declare
  v_order_record record;
  v_lock_obtained boolean;
  v_result jsonb;
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

  -- Begin atomic operation
  begin
    -- Mark order as processed first
    update orders
    set subscription_charge_processed = true
    where id = p_order_id;

    -- Insert payment intent
    insert into payment_intents (
      seller_id,
      order_id,
      stripe_payment_intent_id,
      amount,
      status,
      type
    ) values (
      v_order_record.seller_id,
      p_order_id,
      p_payment_intent_id,
      p_amount,
      'succeeded',
      'subscription_charge'
    )
    on conflict (order_id, type) do nothing;

    return jsonb_build_object(
      'success', true,
      'message', 'Charge processed successfully'
    );

  exception when others then
    -- Rollback will happen automatically
    return jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  end;

end;
$$ language plpgsql security definer;

-- Create indexes for better query performance
create index if not exists idx_payment_intents_lookup 
    on payment_intents(order_id, type, status)
    where type = 'subscription_charge' and status = 'succeeded';

create index if not exists idx_orders_charge_status
    on orders(id, subscription_charge_processed)
    where subscription_charge_processed = true;

-- Grant permissions
grant execute on function process_subscription_charge to authenticated;
grant execute on function get_payment_intent to authenticated;

-- Force schema cache refresh
notify pgrst, 'reload schema';