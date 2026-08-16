# Domain verification readiness

Verify `audienceown.com` in Google Search Console. DNS TXT verification is preferred because it proves stable domain ownership without coupling verification to an application deployment.

1. Add a Domain property for `audienceown.com` in Search Console.
2. Copy the Google-provided TXT value securely.
3. Add that exact TXT record at the authoritative DNS provider for the root domain.
4. Wait for DNS propagation, then select **Verify** in Search Console.
5. Keep the TXT record in DNS and ensure the Google Cloud authorized-domain entry is `audienceown.com`.
6. Submit only HTTPS URLs on that domain for homepage, privacy, terms, deletion instructions, and OAuth redirects.

Alternative supported methods are a Google-provided HTML file or a verification meta tag. Use those only if the owner chooses them. The application intentionally contains no placeholder verification token; add an environment-backed metadata value only after selecting the meta-tag method.
