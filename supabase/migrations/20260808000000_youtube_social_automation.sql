begin;

alter table public.connected_accounts
  add column watch_enabled boolean not null default false,
  add column auto_create_drafts boolean not null default true,
  add column auto_send boolean not null default false,
  add column last_sync_at timestamptz,
  add column last_external_cursor text,
  add column connection_health text not null default 'disconnected'
    check (connection_health in ('disconnected','healthy','degraded','expired','revoked')),
  add column last_connection_error text,
  add column external_account_id text,
  add column external_account_name text,
  add column external_metadata jsonb not null default '{}'::jsonb,
  add column token_expires_at timestamptz,
  add column token_refreshed_at timestamptz,
  add column poll_claimed_until timestamptz;

alter table public.connected_accounts add constraint youtube_automation_only check (
  platform = 'youtube'
  or (
    watch_enabled = false and auto_create_drafts = true and auto_send = false
    and external_account_id is null and external_account_name is null
    and token_expires_at is null and token_refreshed_at is null
  )
);
alter table public.connected_accounts add constraint auto_send_requires_automation check (
  not auto_send or (platform = 'youtube' and watch_enabled and auto_create_drafts)
);
create unique index connected_accounts_youtube_channel_unique
  on public.connected_accounts(creator_id, external_account_id)
  where platform = 'youtube' and external_account_id is not null;
create index connected_accounts_social_poll_idx
  on public.connected_accounts(last_sync_at nulls first)
  where platform = 'youtube' and watch_enabled and connection_health in ('healthy','degraded');
-- OAuth callbacks and poll workers manage connection health/cursors with the
-- service client. PostgreSQL table privileges are required in addition to the
-- service role's RLS bypass.
grant select, insert, update, delete on public.connected_accounts to service_role;

create table public.platform_connection_secrets (
  platform_connection_id uuid primary key references public.connected_accounts(id) on delete cascade,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  token_scope text,
  token_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.platform_connection_secrets is
  'Server-only encrypted OAuth credentials. Never exposed to browser roles.';
create trigger platform_connection_secrets_updated before update on public.platform_connection_secrets
  for each row execute function public.set_updated_at();
alter table public.platform_connection_secrets enable row level security;
alter table public.platform_connection_secrets force row level security;
revoke all on public.platform_connection_secrets from public, anon, authenticated;
grant select, insert, update, delete on public.platform_connection_secrets to service_role;

create table public.social_detection_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  platform_connection_id uuid not null references public.connected_accounts(id) on delete cascade,
  provider text not null check (provider = 'youtube'),
  external_object_id text not null check (btrim(external_object_id) <> ''),
  object_type text not null check (object_type in ('video','livestream')),
  event_type text not null check (event_type in ('published','scheduled','live_started','live_completed','unavailable')),
  source_payload jsonb not null default '{}'::jsonb,
  source_published_at timestamptz,
  detected_at timestamptz not null default now(),
  processing_status text not null default 'pending'
    check (processing_status in ('pending','processing','processed','ignored','failed')),
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, platform_connection_id, external_object_id, event_type),
  constraint social_event_payload_object check (jsonb_typeof(source_payload) = 'object')
);
create index social_detection_creator_detected_idx
  on public.social_detection_events(creator_id, detected_at desc);
create index social_detection_pending_idx
  on public.social_detection_events(created_at) where processing_status in ('pending','failed');
create trigger social_detection_events_updated before update on public.social_detection_events
  for each row execute function public.set_updated_at();

create table public.imported_social_content (
  id uuid primary key default gen_random_uuid(),
  detection_event_id uuid not null unique references public.social_detection_events(id) on delete restrict,
  platform_connection_id uuid not null references public.connected_accounts(id) on delete cascade,
  creator_update_id uuid unique references public.creator_updates(id) on delete restrict,
  status text not null default 'imported'
    check (status in ('imported','draft_ready','approved','auto_published','published','ignored','failed')),
  imported_metadata jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint imported_metadata_object check (jsonb_typeof(imported_metadata) = 'object')
);
create index imported_social_connection_created_idx
  on public.imported_social_content(platform_connection_id, created_at desc);
create trigger imported_social_content_updated before update on public.imported_social_content
  for each row execute function public.set_updated_at();

alter table public.creator_updates
  add column source_provider text check (source_provider is null or source_provider = 'youtube'),
  add column source_external_id text,
  add column source_published_at timestamptz,
  add column source_metadata jsonb not null default '{}'::jsonb,
  add column media_url text check (media_url is null or media_url ~ '^https://');
create unique index creator_updates_social_source_unique
  on public.creator_updates(creator_id, source_provider, source_external_id)
  where source_provider is not null and source_external_id is not null;
create policy "public reads published creator updates" on public.creator_updates for select to anon
  using (status = 'sent' and exists(select 1 from public.creators c
    where c.id = creator_id and c.public_profile_enabled));
grant select(id,creator_id,title,content,cta_url,media_url,sent_at) on public.creator_updates to anon;
-- Service-side automation and recipient resolution read the canonical update
-- after SECURITY DEFINER draft creation. RLS bypass does not confer table grants.
grant select on public.creator_updates to service_role;

create table public.creator_activity (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  activity_type text not null check (activity_type in ('social_draft_generated','social_publish_failed')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 500),
  creator_update_id uuid references public.creator_updates(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index creator_activity_creator_created_idx on public.creator_activity(creator_id, created_at desc);

alter table public.social_detection_events enable row level security;
alter table public.social_detection_events force row level security;
alter table public.imported_social_content enable row level security;
alter table public.imported_social_content force row level security;
alter table public.creator_activity enable row level security;
alter table public.creator_activity force row level security;

create policy "owner reads social detections" on public.social_detection_events for select to authenticated
  using (exists(select 1 from public.creators c where c.id = creator_id and c.owner_user_id = auth.uid()));
create policy "owner reads imported social content" on public.imported_social_content for select to authenticated
  using (exists(select 1 from public.connected_accounts a join public.creators c on c.id = a.creator_id
    where a.id = platform_connection_id and c.owner_user_id = auth.uid()));
create policy "owner reads creator activity" on public.creator_activity for select to authenticated
  using (exists(select 1 from public.creators c where c.id = creator_id and c.owner_user_id = auth.uid()));
create policy "owner updates creator activity" on public.creator_activity for update to authenticated
  using (exists(select 1 from public.creators c where c.id = creator_id and c.owner_user_id = auth.uid()))
  with check (exists(select 1 from public.creators c where c.id = creator_id and c.owner_user_id = auth.uid()));

revoke all on public.social_detection_events, public.imported_social_content, public.creator_activity
  from public, anon, authenticated;
grant select on public.social_detection_events, public.imported_social_content to authenticated;
grant select, update(read_at) on public.creator_activity to authenticated;
grant select, insert, update on public.social_detection_events, public.imported_social_content to service_role;
grant select, insert, update on public.creator_activity to service_role;

create or replace function public.claim_youtube_connections(p_limit integer default 10, p_lease_seconds integer default 120)
returns setof public.connected_accounts
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode = '42501'; end if;
  return query
  with candidates as (
    select a.id from public.connected_accounts a
    where a.platform = 'youtube' and a.watch_enabled
      and a.connection_health in ('healthy','degraded')
      and (a.poll_claimed_until is null or a.poll_claimed_until < now())
    order by a.last_sync_at nulls first
    for update skip locked limit greatest(1, least(p_limit, 100))
  )
  update public.connected_accounts a
  set poll_claimed_until = now() + make_interval(secs => greatest(30, least(p_lease_seconds, 600)))
  from candidates where a.id = candidates.id returning a.*;
end $$;
revoke all on function public.claim_youtube_connections(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_youtube_connections(integer, integer) to service_role;

create or replace function public.ingest_youtube_detection(
  p_connection_id uuid, p_external_object_id text, p_object_type text, p_event_type text,
  p_source_payload jsonb, p_source_published_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare a public.connected_accounts%rowtype; event_row public.social_detection_events%rowtype; was_inserted boolean;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode = '42501'; end if;
  select * into a from public.connected_accounts where id = p_connection_id and platform = 'youtube' for update;
  if not found then raise exception 'YouTube connection not found' using errcode = 'P0002'; end if;
  insert into public.social_detection_events(
    creator_id, platform_connection_id, provider, external_object_id, object_type,
    event_type, source_payload, source_published_at
  ) values (a.creator_id, a.id, 'youtube', p_external_object_id, p_object_type,
    p_event_type, coalesce(p_source_payload, '{}'::jsonb), p_source_published_at)
  on conflict(provider, platform_connection_id, external_object_id, event_type) do nothing
  returning * into event_row;
  was_inserted := found;
  if not was_inserted then
    select * into event_row from public.social_detection_events
    where provider = 'youtube' and platform_connection_id = a.id
      and external_object_id = p_external_object_id and event_type = p_event_type;
  end if;
  return jsonb_build_object('event_id', event_row.id, 'inserted', was_inserted);
end $$;
revoke all on function public.ingest_youtube_detection(uuid,text,text,text,jsonb,timestamptz) from public, anon, authenticated;
grant execute on function public.ingest_youtube_detection(uuid,text,text,text,jsonb,timestamptz) to service_role;

create or replace function public.create_youtube_draft(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare e public.social_detection_events%rowtype; a public.connected_accounts%rowtype;
  imported public.imported_social_content%rowtype; update_id uuid; title_text text; url_text text;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode = '42501'; end if;
  select * into e from public.social_detection_events where id = p_event_id for update;
  if not found then raise exception 'Detection not found' using errcode = 'P0002'; end if;
  select * into a from public.connected_accounts where id = e.platform_connection_id;
  select * into imported from public.imported_social_content where detection_event_id = e.id;
  if found then return jsonb_build_object('update_id', imported.creator_update_id, 'created', false); end if;
  title_text := left(coalesce(nullif(e.source_payload->>'title',''), 'New YouTube content'), 120);
  url_text := coalesce(nullif(e.source_payload->>'canonical_url',''), 'https://www.youtube.com/watch?v=' || e.external_object_id);
  insert into public.creator_updates(
    creator_id,broadcast_type,broadcast_intent,status,title,subject,preview_text,content,
    cta_label,cta_url,affected_platform_connection_id,source_provider,source_external_id,
    source_published_at,source_metadata,media_url
  ) values (
    e.creator_id, case when e.object_type='livestream' then 'livestream' else 'new_content' end::public.broadcast_type,
    case when e.object_type='livestream' then 'livestream' else 'new_video' end::public.broadcast_intent,
    'draft', title_text, 'New YouTube ' || case when e.object_type='livestream' then 'livestream' else 'video' end,
    title_text, 'New YouTube ' || case when e.object_type='livestream' then 'livestream' else 'video' end
      || E'\n\n' || title_text || E'\n\nWatch here:\n' || url_text,
    'Watch on YouTube', url_text, a.id, 'youtube', e.external_object_id, e.source_published_at,
    e.source_payload, nullif(e.source_payload->>'thumbnail_url','')
  ) on conflict(creator_id, source_provider, source_external_id) where source_provider is not null and source_external_id is not null
    do update set updated_at = public.creator_updates.updated_at returning id into update_id;
  insert into public.imported_social_content(detection_event_id,platform_connection_id,creator_update_id,status,imported_metadata)
    values(e.id,a.id,update_id,'draft_ready',e.source_payload)
    on conflict(detection_event_id) do nothing;
  update public.social_detection_events set processing_status='processed',processing_error=null where id=e.id;
  insert into public.creator_activity(creator_id,activity_type,title,body,creator_update_id)
    values(e.creator_id,'social_draft_generated','New YouTube content detected','A draft is ready for review.',update_id);
  return jsonb_build_object('update_id',update_id,'created',true,'auto_send',a.auto_send);
exception when others then
  update public.social_detection_events set processing_status='failed',processing_error=left(sqlerrm,500) where id=p_event_id;
  raise;
end $$;
revoke all on function public.create_youtube_draft(uuid) from public, anon, authenticated;
grant execute on function public.create_youtube_draft(uuid) to service_role;

create or replace function public.get_youtube_automation_analytics()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_creator_id uuid; result jsonb;
begin
  select id into v_creator_id from public.creators where owner_user_id=auth.uid();
  if v_creator_id is null then raise exception 'creator required' using errcode='42501'; end if;
  select jsonb_build_object(
    'detections', count(distinct e.id),
    'imported_items', count(distinct i.id),
    'generated_drafts', count(distinct i.creator_update_id) filter(where i.creator_update_id is not null),
    'approvals', count(distinct i.id) filter(where i.approved_at is not null),
    'automatic_publications', count(distinct i.id) filter(where i.status='auto_published'),
    'ignored_duplicates', count(distinct e.id) filter(where e.processing_status='ignored'),
    'failed_imports', count(distinct e.id) filter(where e.processing_status='failed'),
    'average_detection_latency_seconds', coalesce(avg(extract(epoch from(e.detected_at-e.source_published_at))) filter(where e.source_published_at is not null),0),
    'average_approval_latency_seconds', coalesce(avg(extract(epoch from(i.approved_at-e.detected_at))) filter(where i.approved_at is not null),0),
    'average_publication_latency_seconds', coalesce(avg(extract(epoch from(i.published_at-e.detected_at))) filter(where i.published_at is not null),0),
    'by_content_type', coalesce((select jsonb_object_agg(x.object_type,x.total) from
      (select se.object_type,count(*) total from public.social_detection_events se where se.creator_id=v_creator_id group by se.object_type)x),'{}'::jsonb)
  ) into result
  from public.social_detection_events e left join public.imported_social_content i on i.detection_event_id=e.id
  where e.creator_id=v_creator_id;
  return result;
end $$;
revoke all on function public.get_youtube_automation_analytics() from public, anon;
grant execute on function public.get_youtube_automation_analytics() to authenticated;

commit;
