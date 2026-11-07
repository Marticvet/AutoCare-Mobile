-- Ensure deleting an Auth user can remove only the data that belongs to that
-- account.  The legacy vehicles.uuid_user_id relationship referenced
-- profiles without ON DELETE CASCADE, which caused auth.admin.deleteUser()
-- to fail before it could remove a profile that owns vehicles.
--
-- The project predates its checked-in migrations, so the legacy constraint
-- names and owner-column names cannot be assumed.  This migration changes
-- only the explicit ownership/dependency edges below, preserving the existing
-- column mappings, ON UPDATE action, MATCH mode, deferrability, and validity.
-- It deliberately does not alter a membership's inviter/assignee references:
-- deleting a participant must not delete another owner's shared garage data.

do $$
declare
    fk record;
    child_columns text;
    parent_columns text;
    match_clause text;
    update_clause text;
    deferrability_clause text;
    validation_clause text;
begin
    for fk in
        with ownership_edges(child_table, parent_table) as (
            values
                -- Profile-owned domain rows. This includes the legacy
                -- vehicles.uuid_user_id -> profiles relationship.
                ('vehicles', 'profiles'),
                ('fuel_expenses', 'profiles'),
                ('insurance_expenses', 'profiles'),
                ('service_expenses', 'profiles'),
                ('general_expenses', 'profiles'),
                ('reminders', 'profiles'),
                ('vehicle_documents', 'profiles'),
                ('service_parts', 'profiles'),
                ('charging_expenses', 'profiles'),
                ('vehicle_budgets', 'profiles'),
                ('trips', 'profiles'),
                ('report_schedules', 'profiles'),
                ('checklist_templates', 'profiles'),
                ('checklist_template_items', 'profiles'),
                ('checklist_runs', 'profiles'),
                ('checklist_run_items', 'profiles'),

                -- Vehicle rows are owner data, so their dependent tracking
                -- records are removed with the vehicle, not another account.
                ('fuel_expenses', 'vehicles'),
                ('insurance_expenses', 'vehicles'),
                ('service_expenses', 'vehicles'),
                ('general_expenses', 'vehicles'),
                ('reminders', 'vehicles'),
                ('vehicle_documents', 'vehicles'),
                ('service_parts', 'vehicles'),
                ('charging_expenses', 'vehicles'),
                ('vehicle_budgets', 'vehicles'),
                ('trips', 'vehicles'),
                ('report_schedules', 'vehicles'),
                ('checklist_runs', 'vehicles'),

                -- Dependent ownership edges that can otherwise block a
                -- vehicle/profile cascade.
                ('service_parts', 'service_expenses'),
                ('reminders', 'vehicle_documents'),
                ('checklist_template_items', 'checklist_templates'),
                ('checklist_run_items', 'checklist_runs'),

                -- Removing a garage owner removes that owner's garage and
                -- its access grants, while each member's own garage/data is
                -- governed by that member's separate ownership edges.
                ('garage_memberships', 'garages'),
                ('fleet_billing_accounts', 'garages')
        )
        select
            constraint_row.oid,
            constraint_row.conname,
            child_namespace.nspname as child_schema,
            child_relation.relname as child_table,
            parent_namespace.nspname as parent_schema,
            parent_relation.relname as parent_table,
            constraint_row.conkey,
            constraint_row.confkey,
            constraint_row.confmatchtype,
            constraint_row.confupdtype,
            constraint_row.condeferrable,
            constraint_row.condeferred,
            constraint_row.convalidated
        from pg_constraint constraint_row
        join pg_class child_relation on child_relation.oid = constraint_row.conrelid
        join pg_namespace child_namespace on child_namespace.oid = child_relation.relnamespace
        join pg_class parent_relation on parent_relation.oid = constraint_row.confrelid
        join pg_namespace parent_namespace on parent_namespace.oid = parent_relation.relnamespace
        join ownership_edges edge
          on edge.child_table = child_relation.relname
         and edge.parent_table = parent_relation.relname
        where constraint_row.contype = 'f'
          and child_namespace.nspname = 'public'
          and parent_namespace.nspname = 'public'
          and constraint_row.confdeltype <> 'c'
    loop
        -- Read the columns through pg_constraint rather than assuming the
        -- legacy owner-column name; this also keeps composite FKs safe.
        select string_agg(format('%I', attribute_row.attname), ', ' order by key_column.ordinality)
          into child_columns
          from pg_constraint constraint_row
          cross join lateral unnest(constraint_row.conkey) with ordinality as key_column(attnum, ordinality)
          join pg_attribute attribute_row
            on attribute_row.attrelid = constraint_row.conrelid
           and attribute_row.attnum = key_column.attnum
         where constraint_row.oid = fk.oid;

        select string_agg(format('%I', attribute_row.attname), ', ' order by key_column.ordinality)
          into parent_columns
          from pg_constraint constraint_row
          cross join lateral unnest(constraint_row.confkey) with ordinality as key_column(attnum, ordinality)
          join pg_attribute attribute_row
            on attribute_row.attrelid = constraint_row.confrelid
           and attribute_row.attnum = key_column.attnum
         where constraint_row.oid = fk.oid;

        match_clause := case fk.confmatchtype
            when 'f' then ' match full'
            when 'p' then ' match partial'
            else ''
        end;
        update_clause := case fk.confupdtype
            when 'r' then ' on update restrict'
            when 'c' then ' on update cascade'
            when 'n' then ' on update set null'
            when 'd' then ' on update set default'
            else '' -- NO ACTION is PostgreSQL's default.
        end;
        deferrability_clause := case
            when fk.condeferrable and fk.condeferred then ' deferrable initially deferred'
            when fk.condeferrable then ' deferrable initially immediate'
            else ''
        end;
        validation_clause := case when fk.convalidated then '' else ' not valid' end;

        execute format(
            'alter table %I.%I drop constraint %I',
            fk.child_schema,
            fk.child_table,
            fk.conname
        );
        execute format(
            'alter table %I.%I add constraint %I foreign key (%s) references %I.%I (%s)%s on delete cascade%s%s%s',
            fk.child_schema,
            fk.child_table,
            fk.conname,
            child_columns,
            fk.parent_schema,
            fk.parent_table,
            parent_columns,
            match_clause,
            update_clause,
            deferrability_clause,
            validation_clause
        );
    end loop;

    -- Fail closed if the live schema contains an unrecognised public child of
    -- profiles or vehicles.  Aside from profiles.selected_vehicle_id (the
    -- profile row itself is being deleted), such a relationship could become
    -- the next FK blocker after vehicles.  Raising aborts this whole
    -- transaction rather than leaving a partial migration to discover later.
    if exists (
        select 1
        from pg_constraint constraint_row
        join pg_class child_relation on child_relation.oid = constraint_row.conrelid
        join pg_namespace child_namespace on child_namespace.oid = child_relation.relnamespace
        join pg_class parent_relation on parent_relation.oid = constraint_row.confrelid
        join pg_namespace parent_namespace on parent_namespace.oid = parent_relation.relnamespace
        where constraint_row.contype = 'f'
          and child_namespace.nspname = 'public'
          and parent_namespace.nspname = 'public'
          and parent_relation.relname in ('profiles', 'vehicles')
          and constraint_row.confdeltype <> 'c'
          and not (
              child_relation.relname = 'profiles'
              and parent_relation.relname = 'vehicles'
          )
    ) then
        raise exception 'Account deletion has an unreviewed non-cascading foreign key to profiles or vehicles.';
    end if;
end;
$$;

-- RevenueCat tombstones and queue records intentionally have no reference to
-- auth.users. They outlive Auth deletion so a late webhook cannot recreate a
-- deleted billing customer. No RLS, policy, publication, or queue changes are
-- made by this migration.
