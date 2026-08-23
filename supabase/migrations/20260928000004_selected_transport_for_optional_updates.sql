begin;

-- Optional updates use the follower's selected, verified transport. Legacy
-- connections without a selection retain the established email fallback.
create or replace function public.expected_delivery_transport(
  update_type public.broadcast_type,
  selected_method_type text
)
returns public.delivery_transport
language sql
immutable
set search_path = ''
as $$
  select case
    when selected_method_type = 'email' then 'email'::public.delivery_transport
    when selected_method_type = 'sms' then 'sms'::public.delivery_transport
    when selected_method_type = 'whatsapp' then 'whatsapp'::public.delivery_transport
    when selected_method_type = 'web_push' then 'browser_notification'::public.delivery_transport
    when update_type <> 'account_update' then 'email'::public.delivery_transport
    else null
  end
$$;

revoke all on function public.expected_delivery_transport(public.broadcast_type, text)
  from public, anon, authenticated;

commit;
