begin;
select plan(13);

create temporary table provider_status_contract_row
  (like public.connected_accounts including defaults including constraints);

select lives_ok(format(
  'insert into provider_status_contract_row(creator_id,platform,account_type,label,url,connection_health,provider_status) values (%L,%L,%L,%L,%L,%L,%L)',
  gen_random_uuid(),'website','backup','provider-status-contract','https://example.com/provider-status-contract','healthy',status
), format('provider status %s is accepted',status))
from unnest(array[
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
]) status;

select throws_ok(format(
  'insert into provider_status_contract_row(creator_id,platform,account_type,label,url,connection_health,provider_status) values (%L,%L,%L,%L,%L,%L,%L)',
  gen_random_uuid(),'website','backup','invalid-provider-status','https://example.com/invalid-provider-status','healthy','arbitrary'
), '23514', null, 'invalid provider statuses remain rejected');

select is(
  (select count(*)::integer from provider_status_contract_row where label='provider-status-contract'),
  11,
  'every canonical provider status persisted'
);

select * from finish();
rollback;
