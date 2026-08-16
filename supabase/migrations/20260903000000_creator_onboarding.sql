-- Stage 12.0: persistent, resumable creator onboarding.
begin;
create table public.creator_onboarding(
  creator_id uuid primary key references public.creators(id) on delete cascade,
  recovery_pass_completed_at timestamptz,
  official_step_completed_at timestamptz,
  backup_step_completed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(completed_at is null or recovery_pass_completed_at is not null)
);
comment on table public.creator_onboarding is 'Server-authoritative onboarding milestones. Existing creators were backfilled complete at introduction.';
create trigger creator_onboarding_updated before update on public.creator_onboarding for each row execute function public.set_updated_at();
alter table public.creator_onboarding enable row level security;
alter table public.creator_onboarding force row level security;
create policy "owner reads onboarding" on public.creator_onboarding for select to authenticated using(exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=auth.uid()));
create policy "owner updates onboarding" on public.creator_onboarding for update to authenticated using(exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=auth.uid()))with check(exists(select 1 from public.creators c where c.id=creator_id and c.owner_user_id=auth.uid()));
grant select,update on public.creator_onboarding to authenticated;
grant select,insert,update,delete on public.creator_onboarding to service_role;

-- Every creator that predates this feature remains unaffected.
insert into public.creator_onboarding(creator_id,recovery_pass_completed_at,official_step_completed_at,backup_step_completed_at,completed_at)
select id,now(),now(),now(),now() from public.creators on conflict(creator_id)do nothing;

create or replace function public.create_onboarding_for_creator()returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.creator_onboarding(creator_id)values(new.id)on conflict(creator_id)do nothing;return new;end$$;
revoke all on function public.create_onboarding_for_creator()from public,anon,authenticated;
create trigger on_creator_created_create_onboarding after insert on public.creators for each row execute function public.create_onboarding_for_creator();

alter table public.creators drop constraint if exists creators_reserved_slug;
alter table public.creators add constraint creators_reserved_slug check(public_slug<>all(array['admin','api','auth','c','dashboard','login','logout','register','signup','settings','support','pricing','about','terms','privacy','onboarding']));
commit;
