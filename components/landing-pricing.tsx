"use client";

import { useState } from "react";
import Link from "next/link";
import { BellRing, Check, Headphones, Link2, Megaphone, ShieldCheck, Sparkles, Users } from "lucide-react";
import {freePlanFeatures as freeFeatures,proPlanFeatures}from"@/lib/billing/plan-catalog";

type BillingInterval = "monthly" | "yearly";

const proFeatures = [
  [Link2, "blue", proPlanFeatures[0]],
  [ShieldCheck, "orange", proPlanFeatures[1]],
  [Users, "green", proPlanFeatures[2]],
  [BellRing, "red", proPlanFeatures[3]],
  [Megaphone, "purple", proPlanFeatures[4]],
  [Headphones, "blue", proPlanFeatures[5]],
  [Sparkles, "purple", proPlanFeatures[6]],
] as const;

export function LandingPricing() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const yearly = interval === "yearly";

  return <section className="landing-section pricing-section" id="pricing">
    <div className="pricing-ambient" aria-hidden />
    <header className="landing-section-heading">
      <p className="landing-eyebrow">Start protecting for free</p>
      <h2>Start With the Essentials.<br/>Protect More as You Grow.</h2>
      <p>Build your permanent audience foundation for free, then upgrade when you need greater protection, scale, and recovery capabilities.</p>
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
        <Link href="/register?mode=signup" className="button button-secondary">Create your free page</Link>
      </article>

      <article className="plan-card plan-pro" aria-labelledby="pro-plan-heading">
        <span className="plan-badge">Most Popular</span>
        <p className="card-kicker">Pro</p>
        <h3 id="pro-plan-heading" className="plan-price" aria-live="polite"><span className="sr-only">Pro plan, </span><span key={interval} className="price-value">${yearly ? "10" : "12"}</span> <small>/ month</small></h3>
        <div className="annual-price-note" aria-live="polite">{yearly ? <><span>Billed annually at $120</span><strong>Save $24 per year</strong></> : <span>Monthly billing</span>}</div>
        <p>Everything in Free, plus unlimited protection, unlimited updates, and more powerful tools for creators who are growing.</p>
        <ul>{proFeatures.map(([Icon,tone,item]) => <li key={item}><span className={`plan-feature-icon feature-${tone}`} aria-hidden><Icon /></span>{item}</li>)}</ul>
        <Link href={`/register?mode=signup&intent=pro&interval=${interval}`} className="button button-primary plan-pro-cta">Upgrade to Pro</Link>
      </article>
    </div>

    <ul className="pricing-trust-row" aria-label="Plan flexibility">
      {["Cancel anytime", "No hidden fees", "Upgrade or downgrade anytime"].map(item => <li key={item}><Check aria-hidden />{item}</li>)}
    </ul>
  </section>;
}
