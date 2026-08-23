begin;

-- Recovery methods are written only by trusted Edge Functions and local fixture
-- tooling. RLS remains forced and browser roles retain their column-limited read.
grant select, insert, update, delete on public.follower_recovery_methods to service_role;

commit;
