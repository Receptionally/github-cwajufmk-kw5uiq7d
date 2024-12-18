-- Drop existing policies if they exist
drop policy if exists "payment_intents_read_policy" on public.payment_intents;
drop policy if exists "payment_intents_insert_policy" on public.payment_intents;
drop policy if exists "Enable read access for everyone" on public.payment_intents;
drop policy if exists "Enable insert access for everyone" on public.payment_intents;

-- Create new policies
create policy "payment_intents_read_policy"
    on public.payment_intents for select
    using (true);

create policy "payment_intents_insert_policy"
    on public.payment_intents for insert
    with check (true);

-- Drop existing view if it exists
drop view if exists payment_intents_view cascade;

-- Recreate view with proper column names
create view payment_intents_view as
select
    pi.id,
    pi.seller_id,
    pi.order_id,
    pi.stripe_payment_intent_id,
    pi.amount,
    pi.status,
    pi.type,
    pi.created_at,
    o.customer_name,
    o.customer_email,
    o.product_name,
    o.total_amount as order_amount,
    o.subscription_charge_processed
from payment_intents pi
join orders o on o.id = pi.order_id;

-- Grant permissions
grant select on payment_intents_view to authenticated;

-- Force schema cache refresh
notify pgrst, 'reload schema';