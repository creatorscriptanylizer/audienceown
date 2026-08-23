begin;

-- These legacy views predate the canonical public-page RPC. The base tables are
-- deliberately not readable by anon: granting the columns needed to evaluate
-- these views would also make internal identifiers and publication flags
-- directly queryable. Keep the views for database compatibility, but make them
-- invoker-safe and remove them from every API-facing role. Public reads use the
-- allowlisted get_public_creator_page(text) and
-- get_public_recovery_pass_profile(text) RPCs instead.
alter view public.public_creator_profiles
  set (security_invoker = true);

alter view public.public_connected_accounts
  set (security_invoker = true);

revoke all on public.public_creator_profiles
  from public, anon, authenticated, service_role;
revoke all on public.public_connected_accounts
  from public, anon, authenticated, service_role;

comment on view public.public_creator_profiles is
  'Legacy compatibility view. SECURITY INVOKER and not granted to API roles; use get_public_creator_page(text) or get_public_recovery_pass_profile(text).';
comment on view public.public_connected_accounts is
  'Legacy compatibility view. SECURITY INVOKER and not granted to API roles; public links are returned by get_public_creator_page(text).';

commit;
