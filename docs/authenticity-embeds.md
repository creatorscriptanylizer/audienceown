# Authenticity embeds and QR

Stage 7.1 manifests and the SDK provide structured alternatives to the existing safe iframe; embeds remain presentation-only.

When enabled, embed `<iframe src="https://YOUR_HOST/embed/verify/CREATOR_SLUG" title="Verify CREATOR"></iframe>`. The iframe contains fixed application markup, links only to the canonical AudienceOwn verification page, sends no third-party scripts, and uses an embed-specific CSP with intentional `frame-ancestors` support. Creator title and summary are rendered as text, never HTML.

QR codes encode only `https://YOUR_HOST/verify/CREATOR_SLUG`. They contain no assertion, token, private data, or provider URL. Disabling QR removes it from public and dashboard presentation.
