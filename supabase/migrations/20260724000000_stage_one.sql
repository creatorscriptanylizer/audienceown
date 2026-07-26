create extension if not exists pgcrypto;

create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  public_slug text not null,
  public_bio text check (char_length(public_bio) <= 500),
  public_profile_enabled boolean not null default false,
  profile_image_path text,
  banner_image_path text,
  announcement_title text check (char_length(announcement_title) <= 120),
  announcement_body text check (char_length(announcement_body) <= 3000),
  announcement_cta_label text check (char_length(announcement_cta_label) <= 40),
  announcement_cta_url text check (announcement_cta_url is null or announcement_cta_url ~ '^https://'),
  announcement_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creators_public_slug_format check (
    public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(public_slug) between 3 and 40
  ),
  constraint creators_reserved_slug check (
    public_slug <> all (array['admin','api','auth','c','dashboard','login','logout','register','settings','support','pricing','about'])
  ),
  constraint announcement_complete check (
    (announcement_title is null and announcement_body is null and announcement_published_at is null)
    or (announcement_title is not null and announcement_body is not null and announcement_published_at is not null)
  )
);
create unique index if not exists creators_public_slug_unique on public.creators (lower(public_slug));

create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  platform text not null check (platform in ('youtube','instagram','tiktok','x','facebook','twitch','discord','telegram','website','other')),
  account_type text not null check (account_type in ('official','backup')),
  label text not null check (char_length(label) between 1 and 80),
  url text not null check (url ~ '^https://'),
  is_primary boolean not null default false,
  is_public boolean not null default true,
  position integer not null default 0 check (position between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists one_primary_account_per_type
  on public.connected_accounts (creator_id, account_type) where is_primary;

create table if not exists public.follower_contacts (
  id uuid primary key default gen_random_uuid(),
  email_ciphertext text not null,
  email_hash text not null unique,
  email_masked text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.follower_connections (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  follower_contact_id uuid not null references public.follower_contacts(id) on delete cascade,
  status text not null default 'active' check (status in ('active','unsubscribed')),
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  preference_token_hash text not null unique,
  unsubscribe_token_hash text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, follower_contact_id)
);

create table if not exists public.follower_notification_preferences (
  follower_connection_id uuid primary key references public.follower_connections(id) on delete cascade,
  creator_announcements boolean not null default true,
  new_content boolean not null default true,
  important_account_updates boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.follower_category_preferences (
  follower_connection_id uuid not null references public.follower_connections(id) on delete cascade,
  category_key text not null,
  enabled boolean not null default true,
  primary key (follower_connection_id, category_key)
);

alter table public.creators enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.follower_contacts enable row level security;
alter table public.follower_connections enable row level security;
alter table public.follower_notification_preferences enable row level security;
alter table public.follower_category_preferences enable row level security;

create policy "owner reads creator" on public.creators for select to authenticated
  using (owner_user_id = auth.uid());
create policy "owner inserts creator" on public.creators for insert to authenticated
  with check (owner_user_id = auth.uid());
create policy "owner updates creator" on public.creators for update to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "published creator public read" on public.creators for select to anon
  using (public_profile_enabled);
revoke select on public.creators from anon;
grant select (
  id, display_name, public_slug, public_bio, public_profile_enabled, profile_image_path,
  banner_image_path, announcement_title, announcement_body, announcement_cta_label,
  announcement_cta_url, announcement_published_at, created_at, updated_at
) on public.creators to anon;

create policy "owner manages connected accounts" on public.connected_accounts for all to authenticated
  using (exists (select 1 from public.creators c where c.id = creator_id and c.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.creators c where c.id = creator_id and c.owner_user_id = auth.uid()));
create policy "public reads public connected accounts" on public.connected_accounts for select to anon
  using (is_public and exists (select 1 from public.creators c where c.id = creator_id and c.public_profile_enabled));
revoke select on public.connected_accounts from anon;
grant select (id, creator_id, platform, account_type, label, url, is_primary, is_public, position)
  on public.connected_accounts to anon;

create policy "owner reads follower connections" on public.follower_connections for select to authenticated
  using (exists (select 1 from public.creators c where c.id = creator_id and c.owner_user_id = auth.uid()));
create policy "owner reads notification preferences" on public.follower_notification_preferences for select to authenticated
  using (exists (
    select 1 from public.follower_connections fc join public.creators c on c.id = fc.creator_id
    where fc.id = follower_connection_id and c.owner_user_id = auth.uid()
  ));
create policy "owner reads category preferences" on public.follower_category_preferences for select to authenticated
  using (exists (
    select 1 from public.follower_connections fc join public.creators c on c.id = fc.creator_id
    where fc.id = follower_connection_id and c.owner_user_id = auth.uid()
  ));

-- Contact values are intentionally not browser-readable, including by authenticated creators.
revoke all on public.follower_contacts from anon, authenticated;
revoke insert, update, delete on public.follower_connections from anon, authenticated;
revoke insert, update, delete on public.follower_notification_preferences from anon, authenticated;
revoke insert, update, delete on public.follower_category_preferences from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('creator-media', 'creator-media', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
create policy "creator media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'creator-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "creator media update" on storage.objects for update to authenticated
  using (bucket_id = 'creator-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'creator-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "creator media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'creator-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "creator media public read" on storage.objects for select to public
  using (bucket_id = 'creator-media');

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger creators_updated before update on public.creators for each row execute function public.set_updated_at();
create trigger connected_accounts_updated before update on public.connected_accounts for each row execute function public.set_updated_at();
create trigger follower_connections_updated before update on public.follower_connections for each row execute function public.set_updated_at();
create trigger follower_notification_preferences_updated before update on public.follower_notification_preferences for each row execute function public.set_updated_at();

-- One canonical creator is resolved for every new auth identity.
create or replace function public.create_creator_for_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare base_slug text; candidate text;
begin
  base_slug := regexp_replace(lower(coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'creator')), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  if char_length(base_slug) < 3 or base_slug = any(array['admin','api','auth','c','dashboard','login','logout','register','settings','support','pricing','about'])
  then base_slug := 'creator'; end if;
  candidate := left(base_slug, 31) || '-' || left(replace(new.id::text, '-', ''), 8);
  insert into public.creators(owner_user_id, display_name, public_slug)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'Creator'), candidate)
  on conflict (owner_user_id) do nothing;
  return new;
end $$;
revoke all on function public.create_creator_for_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.create_creator_for_new_user();
