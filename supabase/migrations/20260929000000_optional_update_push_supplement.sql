begin;

-- Optional updates may fan out to verified Email plus each active browser device.
-- Recovery alerts still resolve only through the connection's selected Email method.
alter table public.update_deliveries
  drop constraint if exists update_deliveries_update_connection_transport_unique,
  add constraint update_deliveries_update_connection_method_unique
    unique(update_id, connection_id, recovery_method_id);

create or replace function public.create_update_delivery_queue(
  p_update_id uuid,
  p_creator_id uuid,
  p_recipients jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if not exists (
    select 1 from public.creator_updates update_row
    where update_row.id=p_update_id and update_row.creator_id=p_creator_id
      and (auth.role()<>'authenticated' or exists(select 1 from public.creators creator where creator.id=p_creator_id and creator.owner_user_id=auth.uid()))
  ) then raise exception 'update not found or not owned' using errcode='42501'; end if;

  with candidates as (
    select update_row.id update_id,update_row.creator_id,update_row.broadcast_type,
      connection.id connection_id,connection.follower_contact_id contact_id,
      public.expected_delivery_transport(update_row.broadcast_type,method.method_type) transport,
      method.id recovery_method_id,recipient.destination,recipient.destination_hash
    from public.creator_updates update_row
    cross join lateral jsonb_to_recordset(coalesce(p_recipients,'[]'::jsonb))
      as recipient(connection_id uuid,recovery_method_id uuid,destination text,destination_hash text)
    join public.follower_connections connection on connection.id=recipient.connection_id and connection.creator_id=p_creator_id and connection.status='active'
    join public.follower_category_preferences preference on preference.follower_connection_id=connection.id and preference.category_key=public.expected_update_preference(update_row.broadcast_type) and preference.enabled
    join public.follower_recovery_methods method on method.id=case when update_row.broadcast_type='account_update' then connection.selected_recovery_method_id else recipient.recovery_method_id end and method.follower_contact_id=connection.follower_contact_id and method.method_status='verified'
    join public.follower_contacts contact on contact.id=connection.follower_contact_id
    where update_row.id=p_update_id and update_row.creator_id=p_creator_id and (
      (public.expected_delivery_transport(update_row.broadcast_type,method.method_type)='email' and method.method_type='email' and recipient.destination_hash=method.destination_hash and recipient.destination_hash=contact.email_hash and recipient.destination_hash=encode(extensions.digest(lower(btrim(recipient.destination)),'sha256'),'hex'))
      or (public.expected_delivery_transport(update_row.broadcast_type,method.method_type) in('sms','whatsapp') and method.method_type=public.expected_delivery_transport(update_row.broadcast_type,method.method_type)::text and recipient.destination_hash=method.destination_hash and recipient.destination_hash=contact.phone_hash and recipient.destination_hash=encode(extensions.digest(recipient.destination,'sha256'),'hex'))
      or (public.expected_delivery_transport(update_row.broadcast_type,method.method_type)='browser_notification' and update_row.broadcast_type<>'account_update' and method.method_type='web_push' and method.provider_identifier is not null and btrim(method.provider_identifier)<>'' and recipient.destination=method.provider_identifier and recipient.destination_hash is null)
    )
  ), inserted as (
    insert into public.update_deliveries(update_id,creator_id,connection_id,contact_id,recovery_method_id,transport,destination,destination_hash,preference_category)
    select candidate.update_id,candidate.creator_id,candidate.connection_id,candidate.contact_id,candidate.recovery_method_id,candidate.transport,
      case when candidate.transport='email' then lower(btrim(candidate.destination)) else candidate.destination end,
      candidate.destination_hash,public.expected_update_preference(candidate.broadcast_type)
    from candidates candidate where candidate.transport is not null
    on conflict(update_id,connection_id,recovery_method_id) do nothing
    returning transport
  )
  select jsonb_build_object('created',count(*)::integer,'byTransport',jsonb_build_object(
    'email',count(*)filter(where transport='email'),'sms',count(*)filter(where transport='sms'),
    'whatsapp',count(*)filter(where transport='whatsapp'),'browser_notification',count(*)filter(where transport='browser_notification')))
  into result from inserted;
  return result;
end
$$;

comment on function public.create_update_delivery_queue(uuid,uuid,jsonb) is
  'Queues required recovery through its selected method and optional updates through verified Email plus every active Web Push device.';
revoke all on function public.create_update_delivery_queue(uuid,uuid,jsonb) from public,anon;
grant execute on function public.create_update_delivery_queue(uuid,uuid,jsonb) to authenticated,service_role;

commit;
