# Stripe billing operations

AudienceOwn uses Stripe-hosted Checkout and the Stripe Billing Portal. The application never accepts card data. Stripe webhooks are the authority for plan access; browser redirects and Checkout success pages do not grant Pro.

## Configuration

Create two recurring Stripe Prices for the same Pro product:

- monthly: USD 12.00 every month
- yearly: USD 120.00 every year

Set these server-only environment variables:

```text
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
```

Also set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS application origin. Never expose the secret key or webhook secret through a `NEXT_PUBLIC_` variable. Use Stripe test-mode keys and test-mode Price IDs in local and staging environments, and separate live-mode values in production.

## Webhook

Configure Stripe to send events to:

```text
POST https://<application-origin>/api/billing/stripe/webhook
```

Subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. The endpoint verifies the `Stripe-Signature` against the raw request body before processing anything.

For local testing, forward Stripe CLI events to the local endpoint and use the CLI-provided `whsec_...` secret. Do not reuse it in production.

## State and access rules

`creator_billing_subscriptions` stores the provider projection. `stripe_webhook_events` is the replay ledger. The security-definer projection function is executable only by `service_role`, serializes events per creator, ignores duplicate event IDs, and prevents older events from overwriting newer state.

Only Stripe `active` and `trialing` subscriptions project `plan = 'pro'`. `past_due`, `unpaid`, `incomplete`, `incomplete_expired`, `paused`, and `canceled` project Free immediately without deleting connected accounts or creator data. Product features read `creator_plan_entitlements`; they do not call Stripe on request paths.

Authenticated browser clients have no direct table privileges on billing-provider identifiers. The authenticated status endpoint returns only the safe plan, billing interval, subscription status, renewal/cancellation timing, and cancellation flag. Checkout and Portal endpoints derive the creator from the authenticated session and enforce same-origin requests.

## Checkout, Portal, and recovery

The Checkout endpoint accepts only `monthly` or `yearly`; Price IDs are selected from server configuration. It reuses the creator's Stripe Customer and applies an idempotency key to repeated Checkout creation. Active and trialing creators are directed to manage billing instead of starting a second subscription.

The Portal endpoint uses only the authenticated creator's stored Stripe Customer. Configure the Stripe Portal to allow payment-method updates, invoice viewing, subscription cancellation, and switching between the two approved Pro prices.

The success page polls the local entitlement projection. It displays Pro only after a signed webhook has updated local state. If confirmation is delayed, the page says so and directs the creator back to Settings; Stripe will retry failed webhook deliveries, and replayed events remain safe.

## Deployment checklist

1. Apply the reviewed migrations before enabling Checkout traffic.
2. Configure live monthly/yearly Price IDs and live server secrets in the deployment environment.
3. Create the production webhook endpoint and select the required events.
4. Configure and test the production Billing Portal.
5. Perform a live-mode purchase with a controlled account, then verify webhook delivery, local Pro activation, Portal access, renewal metadata, cancellation, failed-payment downgrade, and preserved creator data.
6. Confirm logs contain event IDs and types but no secrets, card details, or full webhook payloads.

Never run the production migration or create live Stripe resources as part of ordinary local QA.
