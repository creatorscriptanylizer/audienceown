begin;

create table public.youtube_oauth_pending_selections (
  id uuid primary key,
  creator_id uuid not null references public.creators(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_role text not null check (requested_role in ('official','backup')),
  reconnect_connection_id uuid references public.connected_accounts(id) on delete cascade,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  granted_scopes text[] not null,
  token_type text not null,
  token_expires_at timestamptz not null,
  eligible_channels jsonb not null check (jsonb_typeof(eligible_channels) = 'array'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint youtube_pending_short_lived check (expires_at <= created_at + interval '15 minutes')
);
comment on table public.youtube_oauth_pending_selections is
  'Short-lived, server-only YouTube OAuth grants awaiting an explicit channel choice.';
create index youtube_oauth_pending_expiry_idx on public.youtube_oauth_pending_selections(expires_at) where consumed_at is null;
alter table public.youtube_oauth_pending_selections enable row level security;
alter table public.youtube_oauth_pending_selections force row level security;
revoke all on public.youtube_oauth_pending_selections from public, anon, authenticated;
grant select, insert, update, delete on public.youtube_oauth_pending_selections to service_role;

commit;
