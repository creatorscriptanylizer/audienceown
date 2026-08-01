-- Stage 8.2 Provider Expansion I: Twitch, Discord authority, and podcast/RSS sources.
alter table public.connected_accounts drop constraint if exists connected_accounts_platform_check;
alter table public.connected_accounts add constraint connected_accounts_platform_check check(platform in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','threads','pinterest','discord','podcast','rss','website','other','telegram'));
alter table public.connected_accounts drop constraint if exists registered_social_provider;
alter table public.connected_accounts add constraint registered_social_provider check(external_account_id is null or platform in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','threads','pinterest','discord','podcast','rss'));
alter table public.creator_ecosystem_destinations drop constraint if exists creator_ecosystem_destinations_destination_type_check;
alter table public.creator_ecosystem_destinations add constraint creator_ecosystem_destinations_destination_type_check check(destination_type in('community','announcement_channel','developer_profile','organization','repository','package','membership','newsletter','website','application','podcast','feed','livestream','merchandise','commerce','booking','contact','donation','event','other'));
create table public.provider_content_sources(
 id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creators(id)on delete cascade,
 connected_account_id uuid references public.connected_accounts(id)on delete cascade,
 ecosystem_destination_id uuid references public.creator_ecosystem_destinations(id)on delete cascade,
 provider text not null check(provider in('twitch','discord','podcast','rss')),
 source_type text not null check(source_type in('twitch_channel','twitch_videos','twitch_streams','discord_guild','discord_announcement_channel','podcast_feed','rss_feed','atom_feed')),
 stable_source_id text not null,display_name text,canonical_url text check(canonical_url is null or canonical_url~'^https://'),
 configuration jsonb not null default'{}'check(jsonb_typeof(configuration)='object'),detection_enabled boolean not null default true,
 approval_required boolean not null default true,last_cursor text,last_detected_at timestamptz,last_successful_sync_at timestamptz,next_sync_at timestamptz,
 sync_lease_owner uuid,sync_lease_expires_at timestamptz,consecutive_failures integer not null default 0 check(consecutive_failures>=0),
 last_failure_class text,verification_state text not null default'unverified'check(verification_state in('unverified','pending','verified','needs_attention','revoked','unavailable')),
 authority_state text not null default'unknown'check(authority_state in('unknown','user_authorized','bot_authorized','channel_authorized','verified_domain','challenge_verified','revoked')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,stable_source_id)
);
create index provider_content_sources_due_idx on public.provider_content_sources(next_sync_at nulls first)where detection_enabled and verification_state<>'revoked';
create trigger provider_content_sources_updated before update on public.provider_content_sources for each row execute function public.set_updated_at();

create table public.podcast_feed_ownership_challenges(
 id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creators(id)on delete cascade,
 ecosystem_destination_id uuid not null references public.creator_ecosystem_destinations(id)on delete cascade,
 token_hash text not null,placement_method text not null check(placement_method in('channel_field','temporary_item','podcasting_namespace','verified_domain','operator_review')),
 status text not null default'pending'check(status in('pending','verified','expired','failed','superseded')),expires_at timestamptz not null,
 verified_at timestamptz,attempt_count integer not null default 0 check(attempt_count>=0),created_at timestamptz not null default now()
);
create unique index podcast_feed_pending_challenge_idx on public.podcast_feed_ownership_challenges(ecosystem_destination_id)where status='pending';

create table public.twitch_eventsub_subscriptions(
 id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creators(id)on delete cascade,
 connected_account_id uuid not null references public.connected_accounts(id)on delete cascade,provider_subscription_id text not null unique,
 subscription_type text not null,subscription_version text not null,status text not null check(status in('pending','enabled','notification_failures','authorization_revoked','disabled')),
 last_event_at timestamptz,last_reconciled_at timestamptz,next_reconcile_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create trigger twitch_eventsub_subscriptions_updated before update on public.twitch_eventsub_subscriptions for each row execute function public.set_updated_at();

alter table public.social_detection_events drop constraint if exists social_detection_provider_check;
alter table public.social_detection_events add constraint social_detection_provider_check check(provider in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','threads','pinterest','discord','podcast','rss'));
alter table public.creator_updates drop constraint if exists creator_updates_source_provider_check;
alter table public.creator_updates add constraint creator_updates_source_provider_check check(source_provider is null or source_provider in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','threads','pinterest','discord','podcast','rss'));

create or replace function public.claim_provider_content_sources(p_limit integer default 20,p_lease_owner uuid default gen_random_uuid())returns setof public.provider_content_sources language plpgsql security definer set search_path=''as $$begin
 if auth.role()<>'service_role'then raise exception'service role required'using errcode='42501';end if;
 return query with c as(select s.id from public.provider_content_sources s where s.detection_enabled and s.verification_state in('verified','needs_attention','unavailable')and(s.next_sync_at is null or s.next_sync_at<=now())and(s.sync_lease_expires_at is null or s.sync_lease_expires_at<now())order by s.next_sync_at nulls first for update skip locked limit greatest(1,least(p_limit,100)))update public.provider_content_sources s set sync_lease_owner=p_lease_owner,sync_lease_expires_at=now()+interval'3 minutes'from c where s.id=c.id returning s.*;
end$$;
create or replace function public.store_provider_content_source(p_provider text,p_source_type text,p_stable_source_id text,p_display_name text,p_canonical_url text,p_connected_account_id uuid default null,p_destination_id uuid default null,p_configuration jsonb default'{}')returns uuid language plpgsql security definer set search_path=''as $$declare c public.creators%rowtype;sid uuid;begin
 if auth.role()='service_role'then select*into c from public.creators where id=coalesce((select creator_id from public.connected_accounts where id=p_connected_account_id),(select creator_id from public.creator_ecosystem_destinations where id=p_destination_id));else select*into c from public.creators where owner_user_id=auth.uid();end if;if not found then raise exception'access denied'using errcode='42501';end if;
 if p_canonical_url!~'^https://'then raise exception'canonical HTTPS URL required'using errcode='23514';end if;
 insert into public.provider_content_sources(creator_id,connected_account_id,ecosystem_destination_id,provider,source_type,stable_source_id,display_name,canonical_url,configuration,verification_state,authority_state)
 values(c.id,p_connected_account_id,p_destination_id,p_provider,p_source_type,p_stable_source_id,p_display_name,p_canonical_url,coalesce(p_configuration,'{}'),'unverified','unknown')
 on conflict(provider,stable_source_id)do update set display_name=excluded.display_name,canonical_url=excluded.canonical_url returning id into sid;return sid;
end$$;
create or replace function public.start_podcast_feed_challenge(p_destination_id uuid,p_token_hash text,p_placement_method text,p_ttl_minutes integer default 30)returns uuid language plpgsql security definer set search_path=''as $$declare d public.creator_ecosystem_destinations%rowtype;cid uuid;begin select*into d from public.creator_ecosystem_destinations where id=p_destination_id and public.has_creator_permission(creator_id,'emergency_manage')for update;if not found then raise exception'access denied'using errcode='42501';end if;update public.podcast_feed_ownership_challenges set status='superseded'where ecosystem_destination_id=d.id and status='pending';insert into public.podcast_feed_ownership_challenges(creator_id,ecosystem_destination_id,token_hash,placement_method,expires_at)values(d.creator_id,d.id,p_token_hash,p_placement_method,now()+make_interval(mins=>greatest(5,least(p_ttl_minutes,1440))))returning id into cid;return cid;end$$;
create or replace function public.complete_podcast_feed_challenge(p_challenge_id uuid,p_token_hash text,p_max_attempts integer default 5)returns boolean language plpgsql security definer set search_path=''as $$declare ch public.podcast_feed_ownership_challenges%rowtype;begin if auth.role()<>'service_role'then raise exception'service role required'using errcode='42501';end if;select*into ch from public.podcast_feed_ownership_challenges where id=p_challenge_id for update;if not found or ch.status<>'pending'then return false;end if;if ch.expires_at<=now()then update public.podcast_feed_ownership_challenges set status='expired'where id=ch.id;return false;end if;update public.podcast_feed_ownership_challenges set attempt_count=attempt_count+1 where id=ch.id;if ch.attempt_count+1>greatest(1,least(p_max_attempts,20))then update public.podcast_feed_ownership_challenges set status='failed'where id=ch.id;return false;end if;if ch.token_hash<>p_token_hash then return false;end if;update public.podcast_feed_ownership_challenges set status='verified',verified_at=now()where id=ch.id;update public.creator_ecosystem_destinations set verification_status='verified',verification_method='feed_challenge',verification_confidence='medium',last_verified_at=now()where id=ch.ecosystem_destination_id;update public.creator_authenticity_profiles set presentation_revision=presentation_revision+1,issuance_lease_expires_at=null where creator_id=ch.creator_id;update public.provider_content_sources set verification_state='verified',authority_state='challenge_verified',next_sync_at=now()where ecosystem_destination_id=ch.ecosystem_destination_id;return true;end$$;
create or replace function public.mark_provider_source_sync(p_source_id uuid,p_success boolean,p_cursor text default null,p_failure_class text default null,p_next_sync_at timestamptz default null)returns void language plpgsql security definer set search_path=''as $$begin if auth.role()<>'service_role'then raise exception'service role required'using errcode='42501';end if;update public.provider_content_sources set last_cursor=case when p_success then coalesce(p_cursor,last_cursor)else last_cursor end,last_successful_sync_at=case when p_success then now()else last_successful_sync_at end,next_sync_at=coalesce(p_next_sync_at,now()+interval'1 hour'),consecutive_failures=case when p_success then 0 else consecutive_failures+1 end,last_failure_class=case when p_success then null else p_failure_class end,sync_lease_owner=null,sync_lease_expires_at=null where id=p_source_id;end$$;

alter table public.provider_content_sources enable row level security;alter table public.provider_content_sources force row level security;
alter table public.podcast_feed_ownership_challenges enable row level security;alter table public.podcast_feed_ownership_challenges force row level security;
alter table public.twitch_eventsub_subscriptions enable row level security;alter table public.twitch_eventsub_subscriptions force row level security;
create policy"creator provider source reads"on public.provider_content_sources for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
create policy"creator feed challenge reads"on public.podcast_feed_ownership_challenges for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
create policy"creator eventsub reads"on public.twitch_eventsub_subscriptions for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
revoke all on public.provider_content_sources,public.podcast_feed_ownership_challenges,public.twitch_eventsub_subscriptions from public,anon,authenticated;
grant select on public.provider_content_sources,public.podcast_feed_ownership_challenges,public.twitch_eventsub_subscriptions to authenticated;
grant select,insert,update,delete on public.provider_content_sources,public.podcast_feed_ownership_challenges,public.twitch_eventsub_subscriptions to service_role;
revoke all on function public.claim_provider_content_sources(integer,uuid),public.complete_podcast_feed_challenge(uuid,text,integer),public.mark_provider_source_sync(uuid,boolean,text,text,timestamptz)from public,anon,authenticated;
grant execute on function public.claim_provider_content_sources(integer,uuid),public.complete_podcast_feed_challenge(uuid,text,integer),public.mark_provider_source_sync(uuid,boolean,text,text,timestamptz)to service_role;
revoke all on function public.store_provider_content_source(text,text,text,text,text,uuid,uuid,jsonb),public.start_podcast_feed_challenge(uuid,text,text,integer)from public,anon;
grant execute on function public.store_provider_content_source(text,text,text,text,text,uuid,uuid,jsonb),public.start_podcast_feed_challenge(uuid,text,text,integer)to authenticated,service_role;
