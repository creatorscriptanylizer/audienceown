begin;
select plan(10);

select has_table('public', 'browser_push_subscriptions',
  'browser push subscriptions have dedicated storage');
select has_column('public', 'browser_push_subscriptions', 'endpoint_ciphertext',
  'endpoint is encrypted');
select has_column('public', 'browser_push_subscriptions', 'p256dh_ciphertext',
  'p256dh is encrypted');
select has_column('public', 'browser_push_subscriptions', 'auth_ciphertext',
  'auth is encrypted');
select has_column('public', 'browser_push_subscriptions', 'endpoint_hash',
  'endpoint has an authoritative hash');
select col_is_unique('public', 'browser_push_subscriptions', 'endpoint_hash',
  'an endpoint maps to only one browser profile');
select is(
  public.expected_delivery_transport('account_update', 'web_push')::text,
  'browser_notification',
  'web_push Recovery Pass derives browser_notification transport'
);
select is(
  public.expected_delivery_transport('announcement', 'web_push')::text,
  'email',
  'normal broadcasts remain email-only'
);
select is(
  public.delivery_provider_for_transport('browser_notification'),
  'web-push',
  'browser notifications resolve through the provider registry'
);
select throws_ok(
  $$set local role authenticated;
    select * from public.browser_push_subscriptions$$,
  '42501',
  null,
  'subscription secrets are inaccessible to authenticated browser roles'
);

select * from finish();
rollback;
