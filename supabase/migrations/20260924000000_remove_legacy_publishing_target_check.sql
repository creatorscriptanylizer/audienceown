begin;

-- PostgreSQL auto-named the original inline check with the singular
-- `account` prefix. The later explicitly named plural constraint did not
-- replace it, leaving both checks active and blocking the canonical Recovery
-- Pass targeting provenance value.
alter table public.creator_update_publishing_accounts
  drop constraint if exists creator_update_publishing_account_targeting_rule_snapshot_check,
  drop constraint if exists creator_update_publishing_accounts_targeting_rule_snapshot_check,
  add constraint creator_update_publishing_accounts_target_rule_check
    check (targeting_rule_snapshot in ('account_followers','video_opt_ins','recovery_pass_video_opt_in'));

commit;
