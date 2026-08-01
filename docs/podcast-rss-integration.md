# Podcast and RSS integration

Creator-submitted RSS 2.0, Atom, and Podcasting 2.0 feeds are fetched through SSRF-safe bounded requests. Items require a trustworthy publication timestamp and use feed ID plus GUID/Atom ID before canonical-URL fallback. Each object enters the existing social detection and creator draft pipeline exactly once. Directory links are discovery hints and never ownership anchors.
# Spotify distribution linkage

A verified RSS feed remains canonical. Spotify show episodes are distribution matches and must reconcile to feed GUID/canonical identity before creator-owned detection, preventing duplicate updates.
