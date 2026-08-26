-- Persist optional catalogue metadata selected in the vehicle form.
-- Safe to run repeatedly in the Supabase SQL editor.

begin;

alter table public.vehicles
    add column if not exists vehicle_trim text,
    add column if not exists vehicle_fuel_type text;

notify pgrst, 'reload schema';

commit;
