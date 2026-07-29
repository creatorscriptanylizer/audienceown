begin;
select plan(6);

select is(
  public.expected_delivery_transport('account_update'::public.broadcast_type, 'whatsapp'),
  'whatsapp'::public.delivery_transport,
  'WhatsApp recovery methods derive the WhatsApp transport'
);

select is(
  public.delivery_provider_for_transport('whatsapp'::public.delivery_transport),
  'twilio-whatsapp',
  'WhatsApp delivery resolves to the distinct Twilio WhatsApp provider'
);

select is(
  public.expected_delivery_transport('announcement'::public.broadcast_type, 'whatsapp'),
  'email'::public.delivery_transport,
  'normal broadcasts remain email-only'
);

select ok(
  (select relrowsecurity from pg_class
   where oid = 'public.whatsapp_verification_sessions'::regclass),
  'WhatsApp verification sessions have RLS enabled'
);

select ok(
  to_regprocedure('public.complete_whatsapp_recovery_verification(uuid,uuid,text,text,text,timestamp with time zone)') is not null,
  'atomic WhatsApp completion function exists'
);

select ok(
  to_regprocedure('public.opt_out_whatsapp_recovery_method(text,text)') is not null,
  'WhatsApp-only opt-out function exists'
);

select * from finish();
rollback;
