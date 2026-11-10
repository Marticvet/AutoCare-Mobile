-- Server-side invitation delivery. The membership remains the authorization
-- source of truth; email only tells the invited address where to find it.
alter table public.garage_memberships
    add column if not exists invitation_email_sent_at timestamptz,
    add column if not exists invitation_email_delivery_token uuid,
    add column if not exists invitation_email_delivery_attempted_at timestamptz;

create or replace function public.claim_garage_invitation_email(target_membership_id uuid)
returns public.garage_memberships
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    result public.garage_memberships;
begin
    update public.garage_memberships member
    set invitation_email_delivery_token = gen_random_uuid(),
        invitation_email_delivery_attempted_at = now(),
        updated_at = now()
    where member.id = target_membership_id
      and member.status = 'pending'
      and member.invitation_email_sent_at is null
      and (
          member.invitation_email_delivery_token is null
          or member.invitation_email_delivery_attempted_at < now() - interval '5 minutes'
      )
      and public.billing_can_admin_garage(member.garage_id)
    returning member.* into result;

    return result;
end;
$$;

revoke all on function public.claim_garage_invitation_email(uuid) from public;
grant execute on function public.claim_garage_invitation_email(uuid) to authenticated;
