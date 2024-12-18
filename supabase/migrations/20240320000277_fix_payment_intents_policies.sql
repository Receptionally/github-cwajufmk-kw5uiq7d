-- Drop existing policies
drop policy if exists "Enable read access for everyone" on public.payment_intents;
drop policy if exists "Enable insert access for everyone" on public.payment_intents;

-- Create new policies with better names
create policy "payment_intents_read_policy"
    on public.payment_intents for select
    using (true);

create policy "payment_intents_insert_policy"
    on public.payment_intents for insert
    with check (true);

-- Create view for payment intents with order info
create or replace view payment_intents_view as
select
    pi.*,
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