-- Invitation claims require an authenticated AutoCare Hub session. Retain
-- service-role access for server-side operational use only.
revoke execute on function public.claim_garage_invitation_email(uuid) from public;
revoke execute on function public.claim_garage_invitation_email(uuid) from anon;
grant execute on function public.claim_garage_invitation_email(uuid) to authenticated;
grant execute on function public.claim_garage_invitation_email(uuid) to service_role;
