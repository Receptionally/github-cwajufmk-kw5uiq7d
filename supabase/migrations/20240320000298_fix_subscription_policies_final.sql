-- Drop existing policies
drop policy if exists "payment_intents_read_policy" on public.payment_intents;
drop policy if exists "payment_intents_insert_policy" on public.payment_intents;

-- Create new policies with unique names
create policy "payment_intents_select_policy"
    on public.payment_intents for select
    using (true);

create policy "payment_intents_create_policy"
    on public.payment_intents for insert
    with check (true);

-- Force schema cache refresh
notify pgrst, 'reload schema';