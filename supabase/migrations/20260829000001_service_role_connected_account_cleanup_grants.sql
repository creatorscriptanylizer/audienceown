-- The canonical provider-removal lifecycle runs as service_role. RLS bypass
-- does not replace the table privileges required by its local cleanup steps.
grant delete on public.imported_social_content to service_role;
grant delete on public.social_detection_events to service_role;
grant update on public.creator_updates to service_role;
