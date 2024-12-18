-- Drop existing functions first
drop function if exists process_subscription_charge(uuid,text,integer);
drop function if exists is_order_charged(uuid);
drop function if exists get_payment_intent(uuid);

-- Create function to check if order is charged
create function is_order_charged(p_order_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 
    from orders 
    where id = p_order_id 
    and subscription_charge_processed = true
  );
end;
$$ language plpgsql security definer;

-- Create function to get payment intent
create function get_payment_intent(p_order_id uuid)
returns table (
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
    limit 1;
end;
$$ language plpgsql security definer;

-- Create function to process charge
create function process_subscription_charge(
  p_order_id uuid,
  p_payment_intent_id text,
  p_amount integer default 1000
) returns boolean as $$
declare
  v_order_record record;
  v_lock_obtained boolean;
begin
  -- Try to obtain advisory lock
  select pg_try_advisory_xact_lock(hashtext(p_order_id::text)) into v_lock_obtained;
  
  if not v_lock_obtained then
    raise exception 'Could not obtain lock for order processing';
  end if;

  -- Get order with lock
  select * into v_order_record
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  -- Check if already processed
  if v_order_record.subscription_charge_processed then
    return true; -- Return true if already processed
  end if;

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

  return true;
exception 
  when others then
    -- Log error and return false
    raise notice 'Error processing charge: %', sqlerrm;
    return false;
end;
$$ language plpgsql security definer;

-- Grant permissions
grant execute on function is_order_charged to authenticated;
grant execute on function get_payment_intent to authenticated;
grant execute on function process_subscription_charge to authenticated;