# Provider manual fallbacks

- Twitch: canonical channel import plus constrained public-profile or operator proof; URL alone is unverified.
- Discord: public invite, public verification-channel token, verified-domain linkage, or operator review; invite alone is unverified.
- Podcast/RSS: canonical feed import, verified-domain linkage, allowed feed-field/item token, or operator review; directory presence is not proof.

Manual content requires canonical URLs and trustworthy publication timestamps, deduplicates through the standard ingestion pipeline, requires creator approval by default, and never receives stronger trust than its evidence supports.
TikTok video, Instagram post/reel, and Facebook Page-post imports require exact HTTPS provider permalinks, creator title, and a creator-supplied trustworthy timestamp. They remain unverified, approval-required, non-trust-bearing, and never imply account ownership.
