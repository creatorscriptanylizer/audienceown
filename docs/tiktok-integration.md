# TikTok integration

TikTok uses Login Kit authorization-code OAuth with provider-bound state, server-side exchange, encrypted rotating refresh credentials, and `open_id` as the private stable identity anchor. `user.info.basic` enables basic identity; `user.info.profile` is requested for the bio, username, and canonical profile deep link; approved and user-granted `video.list` enables bounded Display API polling.

Handle, display-name, avatar, bio, and profile-link changes with the same stable ID are safe metadata changes. A stable-ID mismatch or revocation suppresses authority and enters the existing monitoring/trust/authenticity workflow. There is no TikTok publishing or fabricated new-video webhook.
