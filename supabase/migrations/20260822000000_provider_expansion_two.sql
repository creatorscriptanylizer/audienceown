-- Stage 8.3 Provider Expansion II: TikTok Display API and selected Meta assets.
alter table public.provider_content_sources drop constraint if exists provider_content_sources_provider_check;
alter table public.provider_content_sources add constraint provider_content_sources_provider_check
  check(provider in('twitch','discord','podcast','rss','tiktok','instagram','facebook'));
alter table public.provider_content_sources drop constraint if exists provider_content_sources_source_type_check;
alter table public.provider_content_sources add constraint provider_content_sources_source_type_check
  check(source_type in('twitch_channel','twitch_videos','twitch_streams','discord_guild','discord_announcement_channel','podcast_feed','rss_feed','atom_feed','tiktok_account','instagram_professional_account','facebook_page'));

create table public.provider_asset_bindings(
 id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creators(id)on delete cascade,
 connected_account_id uuid not null references public.connected_accounts(id)on delete cascade,
 provider text not null check(provider in('tiktok','instagram','facebook')),
 asset_type text not null check(asset_type in('tiktok_account','instagram_professional_account','facebook_page')),
 stable_asset_id text not null,parent_asset_id text,display_name text not null,display_handle text,
 canonical_url text not null check(canonical_url~'^https://'),
 authority_status text not null default'unknown'check(authority_status in('unknown','authorized','insufficient','revoked','unavailable','conflict')),
 verification_status text not null default'unverified'check(verification_status in('unverified','pending','verified','needs_attention','revoked','unavailable')),
 detection_enabled boolean not null default true,approval_required boolean not null default true,public_visible boolean not null default true,
 metadata jsonb not null default'{}'check(jsonb_typeof(metadata)='object'),last_successful_sync_at timestamptz,next_sync_at timestamptz,revoked_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(provider,stable_asset_id),unique(connected_account_id,provider,stable_asset_id)
);
create index provider_asset_bindings_creator_idx on public.provider_asset_bindings(creator_id,provider);
create trigger provider_asset_bindings_updated before update on public.provider_asset_bindings for each row execute function public.set_updated_at();

create table public.provider_asset_secrets(
 asset_binding_id uuid primary key references public.provider_asset_bindings(id)on delete cascade,
 creator_id uuid not null references public.creators(id)on delete cascade,provider text not null check(provider in('instagram','facebook')),
 credential_ciphertext text not null,credential_type text not null check(credential_type in('page_access','instagram_user_access')),
 granted_permissions text[] not null default'{}',expires_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create trigger provider_asset_secrets_updated before update on public.provider_asset_secrets for each row execute function public.set_updated_at();

create table public.provider_access_reviews(
 id uuid primary key default gen_random_uuid(),provider text not null check(provider in('tiktok','instagram','facebook')),
 capability text not null,status text not null default'not_configured'check(status in('not_configured','development_only','review_required','submitted','approved','restricted','rejected','unavailable')),
 access_level text check(access_level is null or access_level in('none','development','standard','advanced','approved')),
 reviewed_at timestamptz,expires_at timestamptz,notes_code text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,capability)
);
create trigger provider_access_reviews_updated before update on public.provider_access_reviews for each row execute function public.set_updated_at();

create table public.provider_verification_challenges(
 id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creators(id)on delete cascade,
 provider text not null check(provider in('tiktok','instagram','facebook')),asset_binding_id uuid references public.provider_asset_bindings(id)on delete cascade,
 canonical_url text not null check(canonical_url~'^https://'),placement_method text not null check(placement_method in('profile_bio','public_post','verified_domain','signed_manifest','operator_review')),
 token_hash text not null,status text not null default'pending'check(status in('pending','verified','expired','failed','superseded')),
 expires_at timestamptz not null,verified_at timestamptz,attempt_count integer not null default 0 check(attempt_count>=0),max_attempts integer not null default 5 check(max_attempts between 1 and 20),created_at timestamptz not null default now()
);
create unique index provider_verification_pending_idx on public.provider_verification_challenges(creator_id,provider,canonical_url)where status='pending';

create table public.meta_webhook_subscriptions(
 id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.creators(id)on delete cascade,
 asset_binding_id uuid not null references public.provider_asset_bindings(id)on delete cascade,object_type text not null check(object_type in('page','instagram')),
 subscribed_fields text[] not null default'{}',status text not null default'pending'check(status in('pending','enabled','degraded','revoked','disabled')),
 last_event_at timestamptz,last_reconciled_at timestamptz,next_reconcile_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(asset_binding_id,object_type)
);
create trigger meta_webhook_subscriptions_updated before update on public.meta_webhook_subscriptions for each row execute function public.set_updated_at();

create or replace function public.select_provider_asset(p_connected_account_id uuid,p_provider text,p_asset_type text,p_stable_asset_id text,p_parent_asset_id text,p_display_name text,p_display_handle text,p_canonical_url text,p_metadata jsonb default'{}')returns uuid language plpgsql security definer set search_path=''as $$declare c public.connected_accounts%rowtype;aid uuid;begin
 if auth.role()<>'service_role'then raise exception'service role required'using errcode='42501';end if;
 select*into c from public.connected_accounts where id=p_connected_account_id for update;if not found then raise exception'connection not found'using errcode='P0002';end if;
 if p_provider<>c.platform or p_canonical_url!~'^https://'then raise exception'invalid asset binding'using errcode='23514';end if;
 if c.external_account_id is not null and c.external_account_id<>p_stable_asset_id then raise exception'stable identity conflict'using errcode='23505';end if;
 insert into public.provider_asset_bindings(creator_id,connected_account_id,provider,asset_type,stable_asset_id,parent_asset_id,display_name,display_handle,canonical_url,authority_status,verification_status,metadata)
 values(c.creator_id,c.id,p_provider,p_asset_type,p_stable_asset_id,nullif(p_parent_asset_id,''),p_display_name,nullif(p_display_handle,''),p_canonical_url,'authorized','verified',coalesce(p_metadata,'{}'))
 on conflict(provider,stable_asset_id)do update set display_name=excluded.display_name,display_handle=excluded.display_handle,canonical_url=excluded.canonical_url,parent_asset_id=excluded.parent_asset_id,metadata=excluded.metadata
 where provider_asset_bindings.creator_id=excluded.creator_id and provider_asset_bindings.connected_account_id=excluded.connected_account_id returning id into aid;
 if aid is null then raise exception'stable identity conflict'using errcode='23505';end if;
 insert into public.provider_content_sources(creator_id,connected_account_id,provider,source_type,stable_source_id,display_name,canonical_url,configuration,verification_state,authority_state,next_sync_at)
 values(c.creator_id,c.id,p_provider,p_asset_type,p_stable_asset_id,p_display_name,p_canonical_url,jsonb_build_object('assetBindingId',aid),'verified','user_authorized',now())
 on conflict(provider,stable_source_id)do update set display_name=excluded.display_name,canonical_url=excluded.canonical_url,configuration=excluded.configuration,next_sync_at=now()
 where provider_content_sources.creator_id=excluded.creator_id and provider_content_sources.connected_account_id=excluded.connected_account_id;
 return aid;end$$;

alter table public.provider_asset_bindings enable row level security;alter table public.provider_asset_bindings force row level security;
alter table public.provider_asset_secrets enable row level security;alter table public.provider_asset_secrets force row level security;
alter table public.provider_access_reviews enable row level security;alter table public.provider_access_reviews force row level security;
alter table public.provider_verification_challenges enable row level security;alter table public.provider_verification_challenges force row level security;
alter table public.meta_webhook_subscriptions enable row level security;alter table public.meta_webhook_subscriptions force row level security;
create policy"creator asset reads"on public.provider_asset_bindings for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
create policy"authenticated review reads"on public.provider_access_reviews for select to authenticated using(true);
create policy"creator verification challenge reads"on public.provider_verification_challenges for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
create policy"creator meta webhook reads"on public.meta_webhook_subscriptions for select to authenticated using(public.has_creator_permission(creator_id,'emergency_manage'));
revoke all on public.provider_asset_bindings,public.provider_asset_secrets,public.provider_access_reviews,public.provider_verification_challenges,public.meta_webhook_subscriptions from public,anon,authenticated;
grant select on public.provider_asset_bindings,public.provider_access_reviews,public.provider_verification_challenges,public.meta_webhook_subscriptions to authenticated;
grant select,insert,update,delete on public.provider_asset_bindings,public.provider_asset_secrets,public.provider_access_reviews,public.provider_verification_challenges,public.meta_webhook_subscriptions to service_role;
revoke all on function public.select_provider_asset(uuid,text,text,text,text,text,text,text,jsonb)from public,anon,authenticated;
grant execute on function public.select_provider_asset(uuid,text,text,text,text,text,text,text,jsonb)to service_role;

create or replace function public.claim_expansion_two_connections(p_limit integer default 20,p_lease_owner uuid default gen_random_uuid())returns setof public.connected_accounts language plpgsql security definer set search_path=''as $$begin
 if auth.role()<>'service_role'then raise exception'service role required'using errcode='42501';end if;
 return query with c as(select a.id from public.connected_accounts a where a.platform in('tiktok','instagram','facebook')and a.watch_enabled and a.provider_status='ready'and a.connection_health in('healthy','degraded')and(a.next_sync_at is null or a.next_sync_at<=now())and(a.lease_expires_at is null or a.lease_expires_at<now())order by a.next_sync_at nulls first,a.last_sync_at nulls first for update skip locked limit greatest(1,least(p_limit,100)))update public.connected_accounts a set lease_owner=p_lease_owner,lease_expires_at=now()+interval'3 minutes',poll_claimed_until=now()+interval'3 minutes'from c where a.id=c.id returning a.*;end$$;
revoke all on function public.claim_expansion_two_connections(integer,uuid)from public,anon,authenticated;grant execute on function public.claim_expansion_two_connections(integer,uuid)to service_role;
