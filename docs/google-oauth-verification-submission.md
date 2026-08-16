# Google OAuth verification submission checklist

## Google Cloud

- [ ] Production OAuth project selected; YouTube Data API enabled
- [ ] OAuth client and branding complete; support email verified; developer contacts current
- [ ] Audience is External and publishing status is prepared for Production
- [ ] Only `youtube.readonly` is selected for YouTube authorization
- [ ] `audienceown.com` is verified and all production redirect URIs use HTTPS
- [ ] Dedicated test account and verification video URL are ready

## AudienceOwn

- [ ] Homepage, privacy, terms, and data-deletion pages are publicly reachable
- [ ] Account deletion, YouTube disconnect, and server-side Google revocation work end to end
- [ ] Encrypted credential storage and absence of raw tokens in logs are verified
- [ ] Support and privacy contacts are monitored and legal copy is reviewed
- [ ] Reviewer account is prepared securely; desktop and mobile OAuth flows are tested

## Submission narrative

- [ ] Explain why `youtube.readonly` is necessary
- [ ] Describe identity, channel, subscriber, upload, scope, expiry, and health data stored
- [ ] Describe refresh cadence, retention, revocation-pending behavior, deletion, and manual fallback
- [ ] Link the demonstration video and provide the exact reviewer script
- [ ] Assign an owner to answer Google follow-up requests promptly

## Security evidence

- [ ] Signed, expiring, one-time nonce state and signed-in creator binding tested
- [ ] Redirects allowlisted; credentials server-only and encrypted; no provider secrets use `NEXT_PUBLIC_`
- [ ] RLS enabled; service-role work creator-scoped; no cross-creator deletion
- [ ] Security searches and automated test/build results are attached to the internal release record
