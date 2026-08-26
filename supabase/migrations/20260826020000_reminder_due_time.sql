-- Store the user's preferred local delivery time for each dated reminder.
alter table public.reminders
    add column if not exists due_time time without time zone not null default '09:00:00';

comment on column public.reminders.due_time is
    'Local wall-clock time at which the device should deliver the due-date reminder.';
