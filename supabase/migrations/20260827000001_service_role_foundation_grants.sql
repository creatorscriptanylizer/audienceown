-- Trusted server processes require table privileges in addition to BYPASSRLS.
-- Browser roles receive no new access and RLS remains forced.
grant select, insert, update, delete on public.creators to service_role;
grant select, insert, update, delete on public.follower_contacts to service_role;
grant select, insert, update, delete on public.follower_connections to service_role;
grant select, insert, update, delete on public.follower_notification_preferences to service_role;
grant select, insert, update, delete on public.follower_category_preferences to service_role;
