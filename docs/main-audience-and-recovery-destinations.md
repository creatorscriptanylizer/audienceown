# Main audience and recovery destinations

The dashboard deliberately presents two different populations.

- **Main audience** is the public follower, subscriber, member, or listener count for the selected authoritative official account. It comes only from an approved provider API and may be hidden, stale, unsupported, or waiting for permission or its first sync.
- **Recovery destination opt-ins** are unique active AudienceOwn fan relationships that selected a particular backup, verified replacement, or approved destination through Recovery Pass.

Public follower totals are never used on backup cards. Destination opt-ins are never presented as public followers. Multiple accounts on one provider retain distinct internal identity relationships and distinct cards.

Global Protected Fans is `count(distinct follower_connection_id)` across active, usable destination preferences. Each destination independently counts unique fans, so destination totals overlap and percentages can sum above 100%. Destination coverage is null when there are no protected fans.

Estimated main-audience protection divides global protected fans by a positive official audience count. It is an estimate because the internal and public populations are not authoritatively linked one-to-one.

Dashboard aggregates derive creator scope from the authenticated user and return no contact details, follower identities, tokens, stable provider identifiers, raw destination addresses, or provider payloads. Popularity never changes identity trust, authenticity, or emergency state.
