# Ecosystem domain manifest

A verified creator domain may publish `/.well-known/audienceown-ecosystem.json` as `audienceown-ecosystem-v1`. Discovery accepts HTTPS destinations on the exact verified host or an allowed verified subdomain. Fetching is SSRF protected, size/time bounded, rejects redirects and private addresses, and validates a strict allowlist.

The manifest supplies a domain relationship signal; it cannot mark entries verified or prove ownership of a third-party provider.

