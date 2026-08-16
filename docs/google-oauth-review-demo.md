# Google OAuth reviewer demonstration

Use a dedicated reviewer account and channel containing no production creator data. Supply credentials to Google through the verification submission, never source control. This walkthrough uses real authentication and authorization and does not bypass access controls.

1. Visit <https://audienceown.com> and identify AudienceOwn, its operator, support, privacy, terms, and data-deletion links.
2. Open Sign in and use the reviewer credentials supplied securely to Google.
3. Open **Platforms**, select YouTube, and choose **Connect with YouTube**.
4. Show the complete English Google consent screen and the single `youtube.readonly` permission.
5. Approve access and return to AudienceOwn.
6. Confirm the selected channel and subscriber synchronization. If subscriber count is hidden, show the honest hidden state.
7. Show where public channel information, subscriber metrics, and public upload metadata appear. Show that there are no YouTube write controls.
8. Open **Settings → Connected Accounts → YouTube** and review the read-only capability explanation and connection health.
9. Choose **Disconnect YouTube**, explain the two distinct manual-destination choices, and confirm one.
10. Confirm Google token revocation, stopped synchronization, and removal of stored authorized data. If Google is unavailable, show the disabled pending state and retry later.
11. Open `/data-deletion` and `/dashboard/settings/account` to show data and account deletion controls.

Before recording, test the production redirect URI, the reviewer channel, and both disconnect choices end to end.
