begin;

update public.follower_connections set source_platform = 'other' where source_platform = 'threads';

alter table public.follower_connections drop constraint if exists follower_connections_source_check;
alter table public.follower_connections add constraint follower_connections_source_check check(source_platform in(
  'tiktok','instagram','youtube','x','facebook','snapchat','twitch','linkedin','spotify','discord','pinterest','website','direct','other'
));

alter table public.provider_audience_metrics drop constraint if exists provider_audience_metrics_provider_check;
alter table public.provider_audience_metrics add constraint provider_audience_metrics_provider_check check(provider in(
  'youtube','instagram','tiktok','x','spotify','twitch','linkedin','facebook','snapchat','pinterest','discord'
));

commit;
