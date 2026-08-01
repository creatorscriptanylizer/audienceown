# Twitch integration

Twitch uses the generic signed OAuth state and PKCE-capable authorization-code flow, encrypted rotating tokens, and the numeric Twitch user ID as its identity anchor. Login and display-name changes preserve identity. Polling detects live streams and archived videos; all detections use canonical Twitch URLs and authoritative timestamps and create standard approval-required drafts. URL-only fallback remains unverified.
