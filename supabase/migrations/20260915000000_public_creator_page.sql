begin;

create or replace function public.get_public_creator_page(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  creator_row public.creators%rowtype;
  normalized_slug text;
  result jsonb;
begin
  normalized_slug := lower(btrim(p_slug));
  if normalized_slug = ''
    or char_length(normalized_slug) > 40
    or normalized_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  then
    return null;
  end if;

  select creator.* into creator_row
  from public.creators as creator
  where lower(creator.public_slug) = normalized_slug
    and creator.public_profile_enabled is true
  limit 1;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'profile', jsonb_build_object(
      'slug', creator_row.public_slug,
      'displayName', creator_row.display_name,
      'bio', creator_row.public_bio,
      'profileImagePath', creator_row.profile_image_path,
      'bannerImagePath', creator_row.banner_image_path,
      'recoveryPassEnabled', creator_row.recovery_pass_enabled,
      'announcement', case
        when creator_row.announcement_published_at is null then null
        else jsonb_build_object(
          'title', creator_row.announcement_title,
          'body', creator_row.announcement_body,
          'ctaLabel', creator_row.announcement_cta_label,
          'ctaUrl', creator_row.announcement_cta_url,
          'publishedAt', creator_row.announcement_published_at
        )
      end,
      'createdAt', creator_row.created_at,
      'updatedAt', creator_row.updated_at
    ),
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
        'platform', account.platform,
        'label', account.label,
        'url', account.url,
        'position', account.position
      ) order by account.position, account.created_at, account.id)
      from public.connected_accounts as account
      where account.creator_id = creator_row.id
        and account.is_public is true
        and account.account_type = 'official'
        and account.connection_health <> 'revoked'
    ), '[]'::jsonb),
    'updates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', recent_update.id,
        'title', recent_update.title,
        'content', recent_update.content,
        'ctaUrl', recent_update.cta_url,
        'mediaUrl', recent_update.media_url,
        'sentAt', recent_update.sent_at
      ) order by recent_update.sent_at desc, recent_update.id desc)
      from (
        select update_row.id, update_row.title, update_row.content,
          update_row.cta_url, update_row.media_url, update_row.sent_at
        from public.creator_updates as update_row
        where update_row.creator_id = creator_row.id
          and update_row.status = 'sent'
          and update_row.sent_at is not null
        order by update_row.sent_at desc, update_row.id desc
        limit 10
      ) as recent_update
    ), '[]'::jsonb),
    'emergency', (
      select jsonb_build_object(
        'title', emergency.title,
        'message', emergency.message,
        'severity', emergency.severity,
        'updatedAt', emergency.updated_at,
        'affected', (
          select jsonb_build_object(
            'provider', affected.provider,
            'displayHandle', affected.display_handle,
            'canonicalProfileUrl', affected.canonical_profile_url
          )
          from public.emergency_affected_accounts as affected
          where affected.emergency_id = emergency.id
            and affected.creator_id = creator_row.id
          order by affected.created_at, affected.id
          limit 1
        ),
        'replacement', (
          select jsonb_build_object(
            'provider', replacement.provider,
            'displayHandle', replacement.display_handle,
            'canonicalProfileUrl', replacement.canonical_profile_url,
            'verifiedAt', replacement.verified_at
          )
          from public.emergency_replacement_accounts as replacement
          where replacement.emergency_id = emergency.id
            and replacement.creator_id = creator_row.id
            and replacement.official is true
            and replacement.verification_state = 'verified'
            and replacement.verified_at is not null
          order by replacement.verified_at desc, replacement.id desc
          limit 1
        )
      )
      from public.creator_emergencies as emergency
      where emergency.creator_id = creator_row.id
        and emergency.lifecycle_status = 'active'
      order by emergency.updated_at desc, emergency.id desc
      limit 1
    )
  ) into result;

  return result;
end
$$;

revoke all on function public.get_public_creator_page(text) from public;
grant execute on function public.get_public_creator_page(text) to anon, authenticated, service_role;

commit;
