-- Stage 8.4 Provider Expansion III: X, LinkedIn, and Threads.
alter table public.connected_accounts drop constraint if exists connected_accounts_platform_check;
alter table public.connected_accounts add constraint connected_accounts_platform_check check(platform in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','threads','pinterest','discord','podcast','rss','website','other','telegram'));
alter table public.connected_accounts drop constraint if exists registered_social_provider;
alter table public.connected_accounts add constraint registered_social_provider check(external_account_id is null or platform in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','threads','pinterest','discord','podcast','rss'));

alter table public.provider_asset_bindings drop constraint if exists provider_asset_bindings_provider_check;
alter table public.provider_asset_bindings add constraint provider_asset_bindings_provider_check check(provider in('tiktok','instagram','facebook','x','linkedin','threads'));
alter table public.provider_asset_bindings drop constraint if exists provider_asset_bindings_asset_type_check;
alter table public.provider_asset_bindings add constraint provider_asset_bindings_asset_type_check check(asset_type in('tiktok_account','instagram_professional_account','facebook_page','x_account','linkedin_member','linkedin_organization','threads_account'));
alter table public.provider_asset_secrets drop constraint if exists provider_asset_secrets_provider_check;
alter table public.provider_asset_secrets add constraint provider_asset_secrets_provider_check check(provider in('instagram','facebook','x','linkedin','threads'));
alter table public.provider_asset_secrets drop constraint if exists provider_asset_secrets_credential_type_check;
alter table public.provider_asset_secrets add constraint provider_asset_secrets_credential_type_check check(credential_type in('page_access','instagram_user_access','oauth_user_access','organization_access','threads_user_access'));
alter table public.provider_access_reviews drop constraint if exists provider_access_reviews_provider_check;
alter table public.provider_access_reviews add constraint provider_access_reviews_provider_check check(provider in('tiktok','instagram','facebook','x','linkedin','threads'));
alter table public.provider_content_sources drop constraint if exists provider_content_sources_provider_check;
alter table public.provider_content_sources add constraint provider_content_sources_provider_check check(provider in('twitch','discord','podcast','rss','tiktok','instagram','facebook','x','linkedin','threads'));
alter table public.provider_content_sources drop constraint if exists provider_content_sources_source_type_check;
alter table public.provider_content_sources add constraint provider_content_sources_source_type_check check(source_type in('twitch_channel','twitch_videos','twitch_streams','discord_guild','discord_announcement_channel','podcast_feed','rss_feed','atom_feed','tiktok_account','instagram_professional_account','facebook_page','x_account','linkedin_member','linkedin_organization','threads_account'));
alter table public.social_detection_events drop constraint if exists social_detection_provider_check;
alter table public.social_detection_events add constraint social_detection_provider_check check(provider in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','threads','pinterest','discord','podcast','rss'));
alter table public.creator_updates drop constraint if exists creator_updates_source_provider_check;
alter table public.creator_updates add constraint creator_updates_source_provider_check check(source_provider is null or source_provider in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','threads','pinterest','discord','podcast','rss'));
alter table public.social_webhook_receipts drop constraint if exists social_webhook_receipts_provider_check;
alter table public.social_webhook_receipts add constraint social_webhook_receipts_provider_check check(provider in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','threads','pinterest','discord'));

create or replace function public.trust_provider_family(p_provider text)returns text language sql immutable set search_path=''as $$select case lower(coalesce(p_provider,''))when'youtube'then'google'when'google'then'google'when'instagram'then'meta'when'facebook'then'meta'when'threads'then'meta'when'tiktok'then'bytedance'when'x'then'x'when'twitter'then'x'when'spotify'then'spotify'when'twitch'then'twitch'when'linkedin'then'linkedin'when'pinterest'then'pinterest'when'discord'then'discord'when'snapchat'then'snapchat'else'other'end$$;

create table public.provider_product_entitlements(
 id uuid primary key default gen_random_uuid(),provider text not null check(provider in('x','linkedin','threads')),product text not null,capability text not null,
 status text not null default'not_configured'check(status in('not_configured','unavailable','development','review_required','submitted','approved','restricted','suspended','rejected')),
 access_tier text,effective_at timestamptz,expires_at timestamptz,notes_code text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,product,capability)
);
create trigger provider_product_entitlements_updated before update on public.provider_product_entitlements for each row execute function public.set_updated_at();

-- Retained only for officially configured X streaming. Polling remains the default.
create table public.provider_stream_checkpoints(
 id uuid primary key default gen_random_uuid(),provider text not null default'x'check(provider='x'),stream_type text not null check(stream_type='filtered_stream'),checkpoint text,status text not null default'disabled'check(status in('disabled','connecting','healthy','degraded','stopped')),
 last_event_at timestamptz,last_heartbeat_at timestamptz,next_reconnect_at timestamptz,consecutive_failures integer not null default 0 check(consecutive_failures>=0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,stream_type)
);
create trigger provider_stream_checkpoints_updated before update on public.provider_stream_checkpoints for each row execute function public.set_updated_at();

create or replace function public.claim_expansion_three_connections(p_limit integer default 20,p_lease_owner uuid default gen_random_uuid())returns setof public.connected_accounts language plpgsql security definer set search_path=''as $$begin
 if auth.role()<>'service_role'then raise exception'service role required'using errcode='42501';end if;
 return query with c as(select a.id from public.connected_accounts a where a.platform in('x','linkedin','threads')and a.watch_enabled and a.provider_status='ready'and a.connection_health in('healthy','degraded')and(a.next_sync_at is null or a.next_sync_at<=now())and(a.lease_expires_at is null or a.lease_expires_at<now())order by a.next_sync_at nulls first,a.last_sync_at nulls first for update skip locked limit greatest(1,least(p_limit,100)))update public.connected_accounts a set lease_owner=p_lease_owner,lease_expires_at=now()+interval'3 minutes',poll_claimed_until=now()+interval'3 minutes'from c where a.id=c.id returning a.*;end$$;

alter table public.provider_product_entitlements enable row level security;alter table public.provider_product_entitlements force row level security;
alter table public.provider_stream_checkpoints enable row level security;alter table public.provider_stream_checkpoints force row level security;
create policy"authenticated entitlement reads"on public.provider_product_entitlements for select to authenticated using(true);
revoke all on public.provider_product_entitlements,public.provider_stream_checkpoints from public,anon,authenticated;
grant select on public.provider_product_entitlements to authenticated;
grant select,insert,update,delete on public.provider_product_entitlements,public.provider_stream_checkpoints to service_role;
revoke all on function public.claim_expansion_three_connections(integer,uuid)from public,anon,authenticated;
grant execute on function public.claim_expansion_three_connections(integer,uuid)to service_role;
