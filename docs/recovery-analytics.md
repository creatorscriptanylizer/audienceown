# Recovery Analytics

The command dashboard reuses the canonical recovery coverage, trend, and Stage 8.6 incident snapshot; it does not recalculate recovery metrics client-side.

The incident-scoped Stage 8.6 panel lives near the top of `/dashboard/analytics/recovery`. See [Live Recovery Analytics](live-recovery-analytics.md), [metric definitions](recovery-metric-definitions.md), and [privacy](recovery-analytics-privacy.md). Unsupported signals remain unavailable rather than being inferred.

Recovery Analytics is creator-scoped aggregate reporting built from the
authoritative creator–follower relationship, selected Recovery Pass, update,
delivery snapshot, and delivery lifecycle records.

## Definitions

- **Total audience:** active creator–follower relationships.
- **Recovery-ready:** an active relationship whose selected recovery method
  belongs to its contact, is verified, has active channel-specific consent,
  is not revoked or opted out, has no permanent invalidation, and remains
  transport-usable. Browser notification methods also require an active
  provider identifier.
- **Uncovered:** an active relationship with no usable selected Recovery Pass
  and no recovery method record.
- **Partially configured:** an active relationship with at least one method
  record but no usable selected Recovery Pass.
- **Coverage rate:** recovery-ready relationships divided by total active
  relationships, returned consistently as a percentage from 0 to 100.

Only `selected_recovery_method_id` determines coverage and transport. Unselected
methods are not counted. Email, SMS, WhatsApp, and web push derive respectively
to email, SMS, WhatsApp, and browser notification. There is no fallback.

## Funnel

The funnel reports current authoritative states: active audience, any recovery
method added, any verified method, a non-null selected method, and currently
recovery-ready. These states do not prove a strict event sequence and should not
be interpreted as behavioural profiling.

## Broadcast performance

Recovery broadcasts are updates with `broadcast_type = account_update`.
Historical performance uses their original `update_deliveries` rows—the
immutable audience snapshot—and never re-evaluates current Recovery Pass
selection. Acceptance rate is provider-accepted or later lifecycle outcomes
divided by snapshot size. Confirmed delivery rate is delivered divided by
snapshot size. Accepted is never treated as delivered, and WhatsApp read is not
a lifecycle state.

## Snapshot strategy and historical limits

Selection and revocation changes cannot be reconstructed completely from the
pre-Stage 3.1 schema. Daily aggregate snapshots therefore begin at analytics
launch. No earlier values are fabricated. Run the bounded service-role RPC once
daily:

```sql
select public.capture_recovery_daily_snapshots(100);
```

It is idempotent per creator and date. AudienceOwn does not install a scheduler;
production must invoke it through the existing trusted job environment.

## Privacy and isolation

Snapshots contain counts only—no fan IDs, destinations, hashes, endpoints, or
method secrets. Creator RPCs derive identity from `auth.uid()`. Snapshot RLS
allows creators to read only their own rows and does not permit creator writes.
Bulk capture is service-role-only.

Detailed breakdowns use `RECOVERY_ANALYTICS_PRIVACY_THRESHOLD`, default 5. If
one non-zero cell falls below the threshold, all non-zero cells in the same
breakdown are suppressed to reduce subtraction risk. High-level total audience
and recovery-ready counts remain exact, matching existing audience reporting.

## Configuration

- `RECOVERY_ANALYTICS_LOW_COVERAGE_PERCENT=50`
- `RECOVERY_ANALYTICS_COVERAGE_DECLINE_PERCENT=10`
- `RECOVERY_ANALYTICS_HIGH_FAILURE_PERCENT=20`
- `RECOVERY_ANALYTICS_MIN_SAMPLE_SIZE=10`
- `RECOVERY_ANALYTICS_PRIVACY_THRESHOLD=5`

Insights are deterministic rules using these local thresholds. They are not
industry benchmarks, statistical claims, or AI-generated recommendations.
Authenticated responses use private, no-store caching for correctness and
cross-user isolation.

## Known limitations

There is no complete coverage history before snapshot launch, production
scheduling is external, analytics have not been validated with real creators,
and production-scale query performance has not been established.
