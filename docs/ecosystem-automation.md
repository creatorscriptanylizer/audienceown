# Ecosystem automation

Active automation and unresolved incident counts feed the command dashboard without exposing raw observations or provider failures.

Stage 8.2 provider sources feed normalized lifecycle changes into this observation, incident, trust, and authenticity refresh system.

Stage 8.1 continuously maintains the Stage 8.0 destination graph. Polling and normalized provider webhooks produce observations, then `ecosystem-automation-v1` classifies them before mutation. Stable external IDs remain the identity anchor.

Same-ID metadata can update automatically. Transfers, ID conflicts, deletion, privacy, or authoritative grant loss suppress public presentation, correlate an incident, create a private creator alert, and refresh trust/authenticity projections. Transient failures retry without immediate revocation. Recovery must be authoritative. Automation never publishes content, activates emergencies, or queues follower delivery.
Stage 8.3 observations flow through existing safe-metadata automation, incident correlation, trust reevaluation, and authenticity refresh. Provider events cannot activate emergencies, publish to providers, or enqueue follower delivery.
Stage 8.4 lifecycle observations reuse safe metadata application, incident correlation, trust reevaluation, and authenticity refresh. No provider observation can publish content, activate an emergency, or enqueue follower delivery.
# Manual-service continuity

Manual services are checked only for an explicit verification or scheduled domain continuity requirement. They are never polled for content. Authority loss queues the existing trust/authenticity actions and removes unsafe official presentation.
