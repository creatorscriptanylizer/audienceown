# AudienceOwn Supabase Auth email templates

Use these subjects in hosted Supabase Authentication > Email Templates:

- Confirm signup: `Confirm Your AudienceOwn Account`
- Reset password: `Reset Your AudienceOwn Password`
- Change email address: `Confirm Your AudienceOwn Email Change`

The HTML files intentionally use Supabase's `{{ .ConfirmationURL }}` variable. Do not replace it with a hardcoded link.

Hosted custom SMTP requires real provider values for host, port, username, password, sender email, and sender name. Keep the password in the Supabase dashboard only. The intended identity is `AudienceOwn <no-reply@auth.audienceown.com>`.

Before enabling the sender, copy only the SPF and DKIM records issued by the selected provider and publish a DMARC record for the sending subdomain. Verify all three with the provider. Do not reuse this auth subdomain for marketing mail.
