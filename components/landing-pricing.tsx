"use client";

import { useState } from "react";
import Link from "next/link";
import { BellRing, Check, Headphones, Link2, Megaphone, ShieldCheck, Sparkles, Users } from "lucide-react";
import {BillingAction}from"@/components/billing-action";

type BillingInterval = "monthly" | "yearly";

const freeFeatures = [
  "1 Main Platform",
  "1 Backup Platform",
  "Up to 500 protected followers",
  "1 Emergency Recovery Alert each month",
  "1 Creator Update each month",
  "Platform Health Monitoring",
  "Permanent Creator Page",
] as const;

const proFeatures = [
  [Link2, "blue", "Unlimited Connected Platforms"],
  [ShieldCheck, "orange", "Unlimited Backup Platforms"],
  [Users, "green", "Unlimited Protected Followers"],
  [BellRing, "red", "Unlimited Emergency Recovery Alerts"],
  [Megaphone, "purple", "Unlimited Creator Updates"],
  [Headphones, "blue", "Priority Support"],
  [Sparkles, "purple", "Premium Creator Tools"],
] as const;

export function LandingPricing() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const yearly = interval === "yearly";

  return <section className="landing-section pricing-section" id="pricing">
    <div className="pricing-ambient" aria-hidden />
    <header className="landing-section-heading">
      <p className="landing-eyebrow">Simple pricing</p>
      <h2>Choose the plan that grows with you.</h2>
      <p>Start free. Upgrade whenever your audience and your needs grow.</p>
      <div className="billing-toggle" role="radiogroup" aria-label="Billing interval">
        <span className={`billing-toggle-thumb ${yearly ? "is-yearly" : ""}`} aria-hidden />
        <button type="button" role="radio" aria-checked={!yearly} onClick={() => setInterval("monthly")}>Monthly</button>
        <button type="button" role="radio" aria-checked={yearly} onClick={() => setInterval("yearly")}>Yearly</button>
      </div>
      <small className="billing-helper">Save $24 every year. Cancel anytime.</small>
    </header>

    <div className="pricing-grid">
      <article className="plan-card plan-free" aria-labelledby="free-plan-heading">
        <p className="card-kicker">Free</p>
        <h3 id="free-plan-heading"><span className="sr-only">Free plan, </span>$0</h3>
        <p>Build your permanent Creator Page, protect your audience, and get started for free.</p>
        <ul>{freeFeatures.map(item => <li key={item}><span className="plan-feature-icon feature-green" aria-hidden><Check /></span>{item}</li>)}</ul>
        <Link href="/register" className="button button-secondary">Create your free page</Link>
      </article>

      <article className="plan-card plan-pro" aria-labelledby="pro-plan-heading">
        <span className="plan-badge">Most Popular</span>
        <p className="card-kicker">Pro</p>
        <h3 id="pro-plan-heading" className="plan-price" aria-live="polite"><span className="sr-only">Pro plan, </span><span key={interval} className="price-value">${yearly ? "10" : "12"}</span> <small>/ month</small></h3>
        <div className="annual-price-note" aria-live="polite">{yearly ? <><span>Billed annually at $120</span><strong>Save $24 per year</strong></> : <span>Monthly billing</span>}</div>
        <p>Everything in Free, plus unlimited protection, unlimited updates, and more powerful tools for creators who are growing.</p>
        <ul>{proFeatures.map(([Icon,tone,item]) => <li key={item}><span className={`plan-feature-icon feature-${tone}`} aria-hidden><Icon /></span>{item}</li>)}</ul>
        <BillingAction kind="checkout" interval={interval} className="button button-primary plan-pro-cta">Upgrade to Pro</BillingAction>
      </article>
    </div>

    <ul className="pricing-trust-row" aria-label="Plan flexibility">
      {["Cancel anytime", "No hidden fees", "Upgrade or downgrade anytime"].map(item => <li key={item}><Check aria-hidden />{item}</li>)}
    </ul>
  </section>;
}
