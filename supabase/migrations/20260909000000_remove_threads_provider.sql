-- Remove the retired social provider and all of its runtime data.
begin;

delete from public.provider_audience_metric_snapshots where provider = 'threads';
delete from public.provider_audience_metrics where provider = 'threads';
delete from public.social_webhook_receipts where provider = 'threads';
delete from public.social_detection_events where provider = 'threads';
delete from public.creator_updates where source_provider = 'threads';
delete from public.provider_content_sources where provider = 'threads';
delete from public.provider_asset_secrets where provider = 'threads';
delete from public.provider_asset_bindings where provider = 'threads';
delete from public.provider_access_reviews where provider = 'threads';
delete from public.provider_product_entitlements where provider = 'threads';
delete from public.identity_monitoring_observations where provider = 'threads';
delete from public.ecosystem_verification_records where provider = 'threads';
delete from public.creator_ecosystem_destinations where provider = 'threads';
delete from public.creator_continuity_statements where provider = 'threads';
delete from public.creator_identity_accounts where provider = 'threads';
delete from public.connected_accounts where platform = 'threads';

alter table public.connected_accounts drop constraint if exists connected_accounts_platform_check;
alter table public.connected_accounts add constraint connected_accounts_platform_check check(platform in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','pinterest','discord','podcast','rss','website','other','telegram'));
alter table public.connected_accounts drop constraint if exists registered_social_provider;
alter table public.connected_accounts add constraint registered_social_provider check(external_account_id is null or platform in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','pinterest','discord','podcast','rss'));

alter table public.provider_asset_bindings drop constraint if exists provider_asset_bindings_provider_check;
alter table public.provider_asset_bindings add constraint provider_asset_bindings_provider_check check(provider in('tiktok','instagram','facebook','x','linkedin','spotify','snapchat','pinterest'));
alter table public.provider_asset_bindings drop constraint if exists provider_asset_bindings_asset_type_check;
alter table public.provider_asset_bindings add constraint provider_asset_bindings_asset_type_check check(asset_type in('tiktok_account','instagram_professional_account','facebook_page','x_account','linkedin_member','linkedin_organization','spotify_user','spotify_artist','spotify_show','snapchat_user','snapchat_public_profile','pinterest_user','pinterest_board','pinterest_claimed_website'));
alter table public.provider_asset_secrets drop constraint if exists provider_asset_secrets_provider_check;
alter table public.provider_asset_secrets add constraint provider_asset_secrets_provider_check check(provider in('instagram','facebook','x','linkedin','spotify','snapchat','pinterest'));
alter table public.provider_asset_secrets drop constraint if exists provider_asset_secrets_credential_type_check;
alter table public.provider_asset_secrets add constraint provider_asset_secrets_credential_type_check check(credential_type in('page_access','instagram_user_access','oauth_user_access','organization_access'));
alter table public.provider_access_reviews drop constraint if exists provider_access_reviews_provider_check;
alter table public.provider_access_reviews add constraint provider_access_reviews_provider_check check(provider in('tiktok','instagram','facebook','x','linkedin','spotify','snapchat','pinterest'));
alter table public.provider_product_entitlements drop constraint if exists provider_product_entitlements_provider_check;
alter table public.provider_product_entitlements add constraint provider_product_entitlements_provider_check check(provider in('x','linkedin','spotify','snapchat','pinterest'));
alter table public.provider_content_sources drop constraint if exists provider_content_sources_provider_check;
alter table public.provider_content_sources add constraint provider_content_sources_provider_check check(provider in('twitch','discord','podcast','rss','tiktok','instagram','facebook','x','linkedin','spotify','snapchat','pinterest'));
alter table public.provider_content_sources drop constraint if exists provider_content_sources_source_type_check;
alter table public.provider_content_sources add constraint provider_content_sources_source_type_check check(source_type in('twitch_channel','twitch_videos','twitch_streams','discord_guild','discord_announcement_channel','podcast_feed','rss_feed','atom_feed','tiktok_account','instagram_professional_account','facebook_page','x_account','linkedin_member','linkedin_organization','spotify_artist','spotify_show','snapchat_public_profile','pinterest_account','pinterest_board'));
alter table public.social_detection_events drop constraint if exists social_detection_provider_check;
alter table public.social_detection_events add constraint social_detection_provider_check check(provider in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','pinterest','discord','podcast','rss'));
alter table public.creator_updates drop constraint if exists creator_updates_source_provider_check;
alter table public.creator_updates add constraint creator_updates_source_provider_check check(source_provider is null or source_provider in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','pinterest','discord','podcast','rss'));
alter table public.social_webhook_receipts drop constraint if exists social_webhook_receipts_provider_check;
alter table public.social_webhook_receipts add constraint social_webhook_receipts_provider_check check(provider in('youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','pinterest','discord'));

create or replace function public.trust_provider_family(p_provider text) returns text language sql immutable set search_path='' as $$select case lower(coalesce(p_provider,'')) when'youtube'then'google' when'google'then'google' when'instagram'then'meta' when'facebook'then'meta' when'tiktok'then'bytedance' when'x'then'x' when'twitter'then'x' when'spotify'then'spotify' when'snapchat'then'snap' when'pinterest'then'pinterest' when'twitch'then'twitch' when'linkedin'then'linkedin' when'discord'then'discord' when'manual_service'then'manual' else'other'end$$;
create or replace function public.claim_expansion_three_connections(p_limit integer default 20,p_lease_owner uuid default gen_random_uuid()) returns setof public.connected_accounts language plpgsql security definer set search_path='' as $$begin if auth.role()<>'service_role'then raise exception'service role required'using errcode='42501';end if;return query with c as(select a.id from public.connected_accounts a where a.platform in('x','linkedin')and a.watch_enabled and a.provider_status='ready'and a.connection_health in('healthy','degraded')and(a.next_sync_at is null or a.next_sync_at<=now())and(a.lease_expires_at is null or a.lease_expires_at<now())order by a.next_sync_at nulls first,a.last_sync_at nulls first for update skip locked limit greatest(1,least(p_limit,100)))update public.connected_accounts a set lease_owner=p_lease_owner,lease_expires_at=now()+interval'3 minutes',poll_claimed_until=now()+interval'3 minutes'from c where a.id=c.id returning a.*;end$$;

commit;
