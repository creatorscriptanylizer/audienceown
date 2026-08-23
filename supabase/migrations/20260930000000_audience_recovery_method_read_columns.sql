-- The authenticated creator Audience dashboard reads these lifecycle fields to
-- exclude revoked and opted-out methods. Row visibility remains owner-scoped by
-- the existing "owner reads recovery methods" RLS policy.
grant select (consent_revoked_at, opted_out_at)
  on public.follower_recovery_methods
  to authenticated;
