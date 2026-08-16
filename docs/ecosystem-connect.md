# Ecosystem Connect

The command dashboard summarizes verified destinations and last successful sync from existing creator-scoped records.

Twitch channels, Discord guild/channel authority, and podcast/RSS feeds project into this same graph through [Provider Expansion I](provider-expansion-one.md).

Stage 8.1 extends this canonical graph with [continuous ecosystem automation](ecosystem-automation.md); it does not replace or duplicate it.

Stage 8.0 projects verified ecosystem destinations into the existing creator identity graph. It does not create a second identity or trust system. Destinations cover communities, developer profiles and organizations, repositories and packages, memberships, newsletters, websites, applications, podcasts and feeds, commerce, booking, contact, donation, event, and other official services.

Authoritative verification is service-role only. Creators may import an HTTPS destination as unverified, control presentation after verification, select one primary destination per type, or archive it. Verification confirms supported control, ownership, authority, or continuity. It does not guarantee moderation, benefits, fulfillment, product quality, or financial safety.

Provider stable IDs are preferred. URLs are fallback identity anchors only when no authoritative stable ID exists. Rename events preserve a destination; stable-ID conflicts suppress it and require attention. Revocation and archive clear public, official, and primary presentation and advance the canonical identity revision.

Public resources are `/api/public/creators/{slug}/ecosystem`, `/verify/{slug}/ecosystem.json`, and exact lookup at `/api/public/ecosystem/lookup`. Only current verified, official, public destinations are serialized.
Selected TikTok, Instagram professional, and Facebook Page assets reuse connected accounts and provider content sources. A Meta authorization alone never creates public ecosystem destinations; explicit asset selection and authority are required.
Stage 8.4 assets reuse provider content sources and selected-asset bindings. LinkedIn login never selects every organization.
# More platforms

Manual services reuse ecosystem concepts through a constrained service connection with an exact public HTTPS URL, category, visibility, and authoritative verification. Initial state is unverified; automatic synchronization and scraping are unavailable.
