# Twitch EventSub

EventSub supports subscription challenges, `stream.online`, `stream.offline`, `channel.update`, `user.update`, and `authorization.revoke`. The handler validates HMAC, message ID, ten-minute replay window, event type, timestamp, and subscription version before storing only a digest receipt and normalized event. Reconciliation is worker-authenticated; polling remains the fallback.
