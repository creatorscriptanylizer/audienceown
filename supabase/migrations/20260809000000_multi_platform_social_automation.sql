begin;

alter table public.connected_accounts drop constraint if exists connected_accounts_platform_check;
alter table public.connected_accounts add constraint connected_accounts_platform_check check (
  platform in ('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook',
    'snapchat','threads','pinterest','discord','website','other','telegram')
);
alter table public.connected_accounts drop constraint if exists youtube_automation_only;
alter table public.connected_accounts
  rename column external_metadata to provider_metadata;
alter table public.connected_accounts
  add column external_account_url text check(external_account_url is null or external_account_url ~ '^https://'),
  add column requested_scopes text[] not null default '{}',
  add column granted_scopes text[] not null default '{}',
  add column webhook_enabled boolean not null default false,
  add column next_sync_at timestamptz,
  add column lease_owner uuid,
  add column lease_expires_at timestamptz,
  add column capability_state jsonb not null default '{}'::jsonb,
  add column provider_status text not null default 'configuration_pending'
    check(provider_status in ('ready','configuration_pending','provider_review_required',
      'provider_plan_required','automatic_detection_unavailable','missing_approved_scope'));
update public.connected_accounts
set external_account_url=url, requested_scopes=case when platform='youtube'
  then array['https://www.googleapis.com/auth/youtube.readonly'] else '{}' end,
  granted_scopes=case when platform='youtube'
  then array['https://www.googleapis.com/auth/youtube.readonly'] else '{}' end,
  provider_status=case when platform='youtube' and external_account_id is not null then 'ready' else 'configuration_pending' end,
  lease_expires_at=poll_claimed_until;
alter table public.connected_accounts add constraint registered_social_provider check (
  external_account_id is null or platform in ('youtube','instagram','tiktok','x','spotify','twitch',
    'linkedin','facebook','snapchat','threads','pinterest','discord')
);
drop index if exists public.connected_accounts_social_poll_idx;
create index connected_accounts_social_poll_idx on public.connected_accounts(next_sync_at nulls first,last_sync_at nulls first)
  where watch_enabled and connection_health in ('healthy','degraded') and provider_status='ready';

alter table public.social_detection_events drop constraint if exists social_detection_events_provider_check;
alter table public.social_detection_events drop constraint if exists social_detection_events_object_type_check;
alter table public.social_detection_events drop constraint if exists social_detection_events_event_type_check;
update public.social_detection_events set event_type='live_ended' where event_type='live_completed';
alter table public.social_detection_events
  add column external_event_id text,
  add column detection_source text not null default 'polling'
    check(detection_source in ('polling','webhook','manual_provider_import')),
  add column provider_event_received_at timestamptz,
  add constraint social_detection_provider_check check(provider in
    ('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','threads','pinterest','discord')),
  add constraint social_detection_object_check check(object_type in
    ('video','short_video','livestream','post','image','carousel','audio_release','podcast_episode','pin','message','article')),
  add constraint social_detection_event_check check(event_type in
    ('published','scheduled','live_started','live_ended','updated','deleted'));
create unique index social_detection_external_event_unique on public.social_detection_events(provider,external_event_id)
  where external_event_id is not null;
create index social_detection_provider_detected_idx on public.social_detection_events(provider,detected_at desc);

alter table public.creator_updates drop constraint if exists creator_updates_source_provider_check;
alter table public.creator_updates add constraint creator_updates_source_provider_check check(source_provider is null or source_provider in
  ('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','threads','pinterest','discord'));

create table public.social_webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check(provider in ('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','threads','pinterest','discord')),
  provider_event_id text not null,
  signature_verified boolean not null,
  event_timestamp timestamptz not null,
  payload_digest text not null,
  processing_status text not null default 'verified' check(processing_status in ('verified','processed','ignored','failed')),
  created_at timestamptz not null default now(),
  unique(provider,provider_event_id)
);
alter table public.social_webhook_receipts enable row level security;
alter table public.social_webhook_receipts force row level security;
revoke all on public.social_webhook_receipts from public,anon,authenticated;
grant select,insert,update on public.social_webhook_receipts to service_role;

create or replace function public.claim_social_connections(
  p_limit integer default 20, p_lease_seconds integer default 180, p_lease_owner uuid default gen_random_uuid()
) returns setof public.connected_accounts
language plpgsql security definer set search_path=''
as $$
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  return query with candidates as (
    select a.id from public.connected_accounts a
    where a.watch_enabled and a.provider_status='ready' and a.connection_health in ('healthy','degraded')
      and (a.next_sync_at is null or a.next_sync_at<=now())
      and (a.lease_expires_at is null or a.lease_expires_at<now())
    order by a.next_sync_at nulls first,a.last_sync_at nulls first
    for update skip locked limit greatest(1,least(p_limit,100))
  ) update public.connected_accounts a set lease_owner=p_lease_owner,
    lease_expires_at=now()+make_interval(secs=>greatest(30,least(p_lease_seconds,900))),
    poll_claimed_until=now()+make_interval(secs=>greatest(30,least(p_lease_seconds,900)))
  from candidates where a.id=candidates.id returning a.*;
end $$;
revoke all on function public.claim_social_connections(integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.claim_social_connections(integer,integer,uuid) to service_role;

create or replace function public.ingest_social_detection(
  p_connection_id uuid,p_provider text,p_external_object_id text,p_external_event_id text,
  p_object_type text,p_event_type text,p_source_payload jsonb,p_source_published_at timestamptz,
  p_detection_source text default 'polling'
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare a public.connected_accounts%rowtype;e public.social_detection_events%rowtype;inserted boolean;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  select * into a from public.connected_accounts where id=p_connection_id and platform=p_provider for update;
  if not found then raise exception 'social connection not found' using errcode='P0002'; end if;
  if p_external_object_id is null or btrim(p_external_object_id)='' or p_source_published_at is null
    or coalesce(p_source_payload->>'canonical_url','') !~ '^https://' then
    raise exception 'malformed social object' using errcode='22023';
  end if;
  insert into public.social_detection_events(creator_id,platform_connection_id,provider,external_object_id,
    external_event_id,object_type,event_type,source_payload,source_published_at,detection_source,provider_event_received_at)
  values(a.creator_id,a.id,p_provider,p_external_object_id,nullif(p_external_event_id,''),p_object_type,p_event_type,
    p_source_payload,p_source_published_at,p_detection_source,case when p_detection_source='webhook' then now() end)
  on conflict(provider,platform_connection_id,external_object_id,event_type) do nothing returning * into e;
  inserted:=found;
  if not inserted then select * into e from public.social_detection_events where provider=p_provider
    and platform_connection_id=a.id and external_object_id=p_external_object_id and event_type=p_event_type; end if;
  return jsonb_build_object('event_id',e.id,'inserted',inserted);
end $$;
revoke all on function public.ingest_social_detection(uuid,text,text,text,text,text,jsonb,timestamptz,text) from public,anon,authenticated;
grant execute on function public.ingest_social_detection(uuid,text,text,text,text,text,jsonb,timestamptz,text) to service_role;

create or replace function public.create_social_draft(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare e public.social_detection_events%rowtype;a public.connected_accounts%rowtype;i public.imported_social_content%rowtype;
  update_id uuid;item_title text;url text;heading text;action text;intent public.broadcast_intent;kind public.broadcast_type;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  select * into e from public.social_detection_events where id=p_event_id for update;
  if not found then raise exception 'detection not found' using errcode='P0002'; end if;
  select * into i from public.imported_social_content where detection_event_id=e.id;
  if found then return jsonb_build_object('update_id',i.creator_update_id,'created',false); end if;
  select * into a from public.connected_accounts where id=e.platform_connection_id;
  item_title:=left(coalesce(nullif(e.source_payload->>'title',''),nullif(e.source_payload->>'description',''),'New content'),120);
  url:=e.source_payload->>'canonical_url';
  heading:=case e.provider when 'instagram' then 'New Instagram post' when 'tiktok' then 'New TikTok video'
    when 'x' then 'New post on X' when 'spotify' then 'New Spotify release'
    when 'twitch' then case when e.event_type='live_started' then 'We are live on Twitch' else 'New Twitch update' end
    when 'linkedin' then 'New LinkedIn post' when 'facebook' then 'New Facebook update'
    when 'threads' then 'New Threads post' when 'pinterest' then 'New Pinterest Pin'
    when 'discord' then 'New Discord announcement' else 'New YouTube video' end;
  action:=case e.provider when 'spotify' then 'Listen on Spotify:' when 'twitch' then 'Watch live:'
    when 'linkedin' then 'Read on LinkedIn:' when 'discord' then 'Open in Discord:'
    when 'tiktok' then 'Watch on TikTok:' when 'youtube' then 'Watch here:'
    else 'View on '||initcap(e.provider)||':' end;
  kind:=case when e.object_type='livestream' then 'livestream' when e.object_type='audio_release' then 'new_content' else 'new_content' end;
  intent:=case when e.object_type='livestream' then 'livestream' when e.object_type='podcast_episode' then 'podcast_episode' else 'new_video' end;
  insert into public.creator_updates(creator_id,broadcast_type,broadcast_intent,status,title,subject,preview_text,content,
    cta_label,cta_url,affected_platform_connection_id,source_provider,source_external_id,source_published_at,source_metadata,media_url)
  values(e.creator_id,kind,intent,'draft',item_title,heading,item_title,heading||E'\n\n'||item_title||E'\n\n'||action||E'\n'||url,
    left(action,60),url,a.id,e.provider,e.external_object_id,e.source_published_at,e.source_payload,nullif(e.source_payload->>'thumbnail_url',''))
  on conflict(creator_id,source_provider,source_external_id) where source_provider is not null and source_external_id is not null
    do update set updated_at=public.creator_updates.updated_at returning id into update_id;
  insert into public.imported_social_content(detection_event_id,platform_connection_id,creator_update_id,status,imported_metadata)
    values(e.id,a.id,update_id,'draft_ready',e.source_payload) on conflict(detection_event_id) do nothing;
  update public.social_detection_events set processing_status='processed',processing_error=null where id=e.id;
  insert into public.creator_activity(creator_id,activity_type,title,body,creator_update_id)
    values(e.creator_id,'social_draft_generated','New '||initcap(e.provider)||' content detected','A draft is ready for review.',update_id);
  return jsonb_build_object('update_id',update_id,'created',true,'auto_send',a.auto_send);
end $$;
revoke all on function public.create_social_draft(uuid) from public,anon,authenticated;
grant execute on function public.create_social_draft(uuid) to service_role;

create or replace function public.mark_social_connection_healthy(p_connection_id uuid,p_cursor text,p_next_sync_at timestamptz)
returns void language plpgsql security definer set search_path='' as $$
begin if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501';end if;
update public.connected_accounts set connection_health='healthy',last_connection_error=null,last_sync_at=now(),
last_external_cursor=coalesce(p_cursor,last_external_cursor),next_sync_at=p_next_sync_at,lease_owner=null,lease_expires_at=null,poll_claimed_until=null
where id=p_connection_id;end$$;
create or replace function public.mark_social_connection_unhealthy(p_connection_id uuid,p_health text,p_error text,p_next_sync_at timestamptz)
returns void language plpgsql security definer set search_path='' as $$
begin if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501';end if;
update public.connected_accounts set connection_health=p_health,last_connection_error=left(p_error,500),next_sync_at=p_next_sync_at,
lease_owner=null,lease_expires_at=null,poll_claimed_until=null where id=p_connection_id;end$$;
revoke all on function public.mark_social_connection_healthy(uuid,text,timestamptz),public.mark_social_connection_unhealthy(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.mark_social_connection_healthy(uuid,text,timestamptz),public.mark_social_connection_unhealthy(uuid,text,text,timestamptz) to service_role;

create or replace function public.get_social_automation_analytics(p_provider text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cid uuid;result jsonb;
begin select id into cid from public.creators where owner_user_id=auth.uid();
if cid is null then raise exception 'creator required' using errcode='42501';end if;
select jsonb_build_object('detections',count(distinct e.id),'drafts',count(distinct i.creator_update_id),
'automatic_publications',count(distinct i.id) filter(where i.status='auto_published'),
'failed_imports',count(distinct e.id) filter(where e.processing_status='failed'),
'manual_imports',count(distinct e.id) filter(where e.detection_source='manual_provider_import'),
'by_provider',coalesce((select jsonb_object_agg(provider,total) from(select se.provider,count(*) total from public.social_detection_events se
where se.creator_id=cid and(p_provider is null or se.provider=p_provider)group by se.provider)x),'{}'::jsonb),
'by_source',coalesce((select jsonb_object_agg(detection_source,total) from(select se.detection_source,count(*) total from public.social_detection_events se
where se.creator_id=cid and(p_provider is null or se.provider=p_provider)group by se.detection_source)x),'{}'::jsonb))
into result from public.social_detection_events e left join public.imported_social_content i on i.detection_event_id=e.id
where e.creator_id=cid and(p_provider is null or e.provider=p_provider);return result;end$$;
revoke all on function public.get_social_automation_analytics(text) from public,anon;
grant execute on function public.get_social_automation_analytics(text) to authenticated;

-- Compatibility wrappers keep Stage 4.0 callers safe during rollout.
create or replace function public.claim_youtube_connections(p_limit integer default 10,p_lease_seconds integer default 120)
returns setof public.connected_accounts language sql security definer set search_path='' as $$
select * from public.claim_social_connections(p_limit,p_lease_seconds,gen_random_uuid()) where platform='youtube'$$;
create or replace function public.create_youtube_draft(p_event_id uuid) returns jsonb language sql security definer set search_path=''
as $$select public.create_social_draft(p_event_id)$$;

commit;
