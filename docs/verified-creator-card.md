# Verified Creator Card

`components/authenticity/verified-creator-card.tsx` renders the same safe record used by the verification page and public API. It shows the creator name, derived state, official current destinations, update date, and canonical verification link. The compact form is used on `/c/:slug`; `/verify/:slug` renders the complete form.

Creators can change title, summary, visibility, timestamp, continuity, embed, and QR presentation settings. They cannot choose a badge, state, color strength, official status, monitoring status, emergency status, or verification timestamp. Emergency state takes priority; restricted identities show a neutral unavailable state and no verified destinations.
