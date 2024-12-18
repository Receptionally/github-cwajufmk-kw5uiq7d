-- Add index for subscription tracking if it doesn't exist
create index if not exists idx_orders_subscription_processed 
    on orders(subscription_charge_processed)
    where subscription_charge_processed = true;

-- Create view for order charges
create or replace view order_charges as
select
    o.id as order_id,
    o.seller_id,
    o.subscription_charge_processed,
    pi.stripe_payment_intent_id,
    pi.amount,
    pi.status,
    pi.created_at as charge_date
from orders o
left join payment_intents pi 
    on o.id = pi.order_id 
    and pi.type = 'subscription_charge'
where o.subscription_charge_processed = true;

-- Create function to check payment status
create or replace function get_payment_intent(p_order_id uuid)
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

-- Grant permissions
grant select on order_charges to authenticated;
grant execute on function get_payment_intent to authenticated;

-- Force schema cache refresh
notify pgrst, 'reload schema';