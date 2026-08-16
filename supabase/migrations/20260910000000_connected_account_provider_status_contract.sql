begin;

alter table public.connected_accounts
  drop constraint if exists connected_accounts_provider_status_check;

alter table public.connected_accounts
  add constraint connected_accounts_provider_status_check check (provider_status in (
    'ready',
    'configuration_pending',
    'provider_review_required',
    'provider_plan_required',
    'automatic_detection_unavailable',
    'missing_approved_scope',
    'app_review_required',
    'asset_selection_required',
    'public_invite_required',
    'public_url_required',
    'reconnect_required'
  ));

commit;
