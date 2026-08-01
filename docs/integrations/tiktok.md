# TikTok
Configure Login Kit with `TIKTOK_*` and callback
`/api/integrations/tiktok/callback`. Request `user.info.basic` and reviewed
`video.list`; PKCE is used. Until review is granted the UI reports
provider-review-required. Public videos use official list data only.
`authorization.removed` must enter the verified social webhook route.
Stage 8.3 uses Login Kit and Display API only. Automatic videos require credentials, product setup, approved and granted `video.list`; otherwise the connection remains identity-only with manual public-video import.
