begin;
alter table public.youtube_oauth_pending_selections
  add column recovery_for_main_account_id uuid references public.connected_accounts(id) on delete set null;
comment on column public.youtube_oauth_pending_selections.recovery_for_main_account_id is
  'Optional Main-account context inherited from the existing signed OAuth state for post-selection Recovery auto-linking.';
commit;
