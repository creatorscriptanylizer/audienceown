begin;

-- Local Supabase routes REST calls through its gateway, so PostgREST sees the
-- container name in Host and the browser-facing loopback address in
-- X-Forwarded-Host. Hosted projects still fail this loopback-only predicate.
create or replace function public.is_local_qa_database()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    current_setting('request.headers', true)::jsonb->>'x-forwarded-host',
    current_setting('request.headers', true)::jsonb->>'host',
    ''
  ) ~* '^(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'
$$;

revoke all on function public.is_local_qa_database() from public, anon;
grant execute on function public.is_local_qa_database() to authenticated, service_role;

commit;
