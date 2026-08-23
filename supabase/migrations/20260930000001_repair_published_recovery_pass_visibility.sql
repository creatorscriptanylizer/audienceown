begin;

-- Recovery Pass creation publishes both flags atomically. Repair legacy rows
-- created before that invariant so an enabled, named pass remains reachable by
-- its permanent public URL.
update public.creators
set public_profile_enabled = true
where recovery_pass_enabled is true
  and public_slug is not null
  and public_profile_enabled is false;

commit;
