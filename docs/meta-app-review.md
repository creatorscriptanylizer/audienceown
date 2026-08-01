# Meta app review and access

Readiness distinguishes missing credentials, product configuration, unrequested or ungranted permissions, development access, standard/advanced access, submitted review, approval, restriction, and rejection. `META_APP_REVIEW_STATUS` and `INSTAGRAM_APP_REVIEW_STATUS` default to `not_configured`; tests never assume approval.

Development/tester success is not production readiness. Automatic detection requires the configured product, approved access where required, user-granted permissions, and sufficient selected-asset authority. Manual fallback stays visible when any prerequisite is absent.
