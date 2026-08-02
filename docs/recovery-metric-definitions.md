# Recovery metric definitions

- **Fans targeted:** distinct eligible delivery audience connections for the incident update, deduplicated across transports.
- **Alerts sent:** distinct audience connections in sending, accepted, delivered, bounced, or complained states. Queued-only records are excluded and delivery retries cannot increase the distinct count.
- **Alerts opened:** distinct authoritative open/read recipients. Currently unavailable because recovery transports do not expose a canonical incident-scoped signal; delivery and page visits are never substituted.
- **Recovery page visits:** privacy-safe unique incident page visits. Currently unavailable; aggregate page-view counters are not unique or incident-scoped.
- **Follow clicks:** privacy-safe unique verified-destination clicks. Currently unavailable; preview and aggregate clicks are not substituted.
- **Migration rate:** a server-calculated confirmed completion or click-through proxy numerator divided by Fans targeted. It is unavailable when the denominator is zero or the numerator is unsupported. No external follow is claimed without provider confirmation.

Unavailable is `null`, never zero. Partial open coverage includes supported and unsupported transport lists. KPI and funnel values consume the same RPC response without client calculation.
