-- Additive Stage 1 Recovery Pass architecture. Existing contact and connection IDs are preserved.
alter table public.creators
  add column if not exists recovery_pass_enabled boolean not null default true;

alter table public.follower_contacts
  alter column email_ciphertext drop not null,
  alter column email_hash drop not null,
  alter column email_masked drop not null,
  add column if not exists phone_ciphertext text,
  add column if not exists phone_hash text,
  add column if not exists phone_masked text,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists follower_contacts_phone_hash_unique
  on public.follower_contacts(phone_hash) where phone_hash is not null;

alter table public.follower_connections
  drop constraint if exists follower_connections_status_check;
alter table public.follower_connections
  add constraint follower_connections_status_check check (status in ('active','paused','deactivated','unsubscribed')),
  add column if not exists activated_at timestamptz,
  add column if not exists deactivated_at timestamptz,
  add column if not exists source_platform text not null default 'direct',
  add column if not exists source_campaign text,
  add column if not exists source_referrer text,
  add column if not exists landing_path text,
  add column if not exists consent_source text not null default 'legacy_creator_page';
update public.follower_connections set activated_at = consented_at where activated_at is null;
alter table public.follower_connections alter column activated_at set default now();
alter table public.follower_connections
  add constraint follower_connections_source_check check (source_platform in (
    'tiktok','instagram','youtube','x','facebook','threads','snapchat','twitch',
    'linkedin','spotify','discord','pinterest','website','direct','other'
  ));

create table if not exists public.follower_recovery_methods (
  id uuid primary key default gen_random_uuid(),
  follower_contact_id uuid not null references public.follower_contacts(id) on delete cascade,
  method_type text not null check (method_type in ('email','sms','web_push','google','apple','passkey')),
  method_status text not null default 'verified' check (method_status in ('pending','verified','revoked')),
  destination_hash text,
  destination_masked text,
  provider_identifier text,
  verified_at timestamptz,
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(follower_contact_id, method_type, destination_hash)
);

insert into public.follower_recovery_methods (
  follower_contact_id, method_type, method_status, destination_hash, destination_masked, verified_at, consented_at
)
select id, 'email', 'verified', email_hash, email_masked, created_at, created_at
from public.follower_contacts where email_hash is not null
on conflict do nothing;

alter table public.follower_recovery_methods enable row level security;
create policy "owner reads recovery methods" on public.follower_recovery_methods for select to authenticated
  using (exists (
    select 1 from public.follower_connections fc join public.creators c on c.id = fc.creator_id
    where fc.follower_contact_id = follower_recovery_methods.follower_contact_id and c.owner_user_id = auth.uid()
  ));
revoke insert, update, delete on public.follower_recovery_methods from anon, authenticated;

create index if not exists follower_connections_creator_status_idx
  on public.follower_connections(creator_id,status,activated_at desc);
create index if not exists follower_connections_creator_source_idx
  on public.follower_connections(creator_id,source_platform);
create index if not exists follower_recovery_methods_contact_status_idx
  on public.follower_recovery_methods(follower_contact_id,method_status);

create trigger follower_contacts_updated before update on public.follower_contacts
  for each row execute function public.set_updated_at();
create trigger follower_recovery_methods_updated before update on public.follower_recovery_methods
  for each row execute function public.set_updated_at();

