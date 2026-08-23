"use client";

import { useEffect } from "react";

const COUNT_DURATION = 2300;
const COMPLETE_HOLD = 4500;
const RESET_FADE = 320;

function formatProtected(value: number) {
  if (value < 1000) return Math.round(value).toLocaleString("en-US");
  return `${Math.round(value / 1000)}K`;
}

function formatAudience(value: number) {
  if (value < 1000) return Math.round(value).toLocaleString("en-US");
  if (value < 1_000_000) return `${Math.round(value / 1000)}K`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}

export function LandingMotion() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".protection-landing");
    const dashboard = page?.querySelector<HTMLElement>(".protection-dashboard");
    const protectedMetric = dashboard?.querySelector<HTMLElement>("[data-protected-metric]");
    const audienceMetric = dashboard?.querySelector<HTMLElement>("[data-audience-metric]");
    page?.classList.add("motion-ready");
    const targets = Array.from(document.querySelectorAll<HTMLElement>(
      ".protection-landing .landing-section, .protection-landing .final-cta",
    ));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((target) => target.classList.add("is-revealed"));
      if (protectedMetric) protectedMetric.textContent = "816K";
      if (audienceMetric) audienceMetric.textContent = "1.2M";
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    targets.forEach((target) => observer.observe(target));
    let frameId: number | undefined;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    let isVisible = false;
    let cycle = 0;

    const clearMetricWork = () => {
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      if (holdTimer !== undefined) clearTimeout(holdTimer);
      if (resetTimer !== undefined) clearTimeout(resetTimer);
      frameId = holdTimer = resetTimer = undefined;
    };
    const showFinalMetrics = () => {
      if (!protectedMetric || !audienceMetric) return;
      protectedMetric.textContent = "816K";
      audienceMetric.textContent = "1.2M";
      protectedMetric.classList.remove("is-counting", "is-resetting");
      audienceMetric.classList.remove("is-counting", "is-resetting");
    };
    const runCycle = (cycleId: number) => {
      if (!isVisible || cycleId !== cycle || !protectedMetric || !audienceMetric) return;
      const startedAt = performance.now();
      protectedMetric.classList.add("is-counting");
      audienceMetric.classList.add("is-counting");
      const tick = (now: number) => {
        if (!isVisible || cycleId !== cycle) return;
        const progress = Math.min((now - startedAt) / COUNT_DURATION, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        protectedMetric.textContent = progress === 1 ? "816K" : formatProtected(816_000 * eased);
        audienceMetric.textContent = progress === 1 ? "1.2M" : formatAudience(1_200_000 * eased);
        if (progress < 1) {
          frameId = requestAnimationFrame(tick);
          return;
        }
        protectedMetric.classList.remove("is-counting");
        audienceMetric.classList.remove("is-counting");
        holdTimer = setTimeout(() => {
          if (!isVisible || cycleId !== cycle) return;
          protectedMetric.classList.add("is-resetting");
          audienceMetric.classList.add("is-resetting");
          resetTimer = setTimeout(() => {
            if (!isVisible || cycleId !== cycle) return;
            protectedMetric.textContent = "0";
            audienceMetric.textContent = "0";
            frameId = requestAnimationFrame(() => {
              protectedMetric.classList.remove("is-resetting");
              audienceMetric.classList.remove("is-resetting");
              runCycle(cycleId);
            });
          }, RESET_FADE);
        }, COMPLETE_HOLD);
      };
      frameId = requestAnimationFrame(tick);
    };
    const metricObserver = dashboard && protectedMetric && audienceMetric
      ? new IntersectionObserver(([entry]) => {
          if (!entry) return;
          isVisible = entry.isIntersecting;
          clearMetricWork();
          cycle += 1;
          showFinalMetrics();
          if (isVisible) {
            protectedMetric.textContent = "0";
            audienceMetric.textContent = "0";
            runCycle(cycle);
          }
        }, { threshold: 0.18 })
      : undefined;
    if (dashboard) metricObserver?.observe(dashboard);
    return () => {
      observer.disconnect();
      metricObserver?.disconnect();
      isVisible = false;
      clearMetricWork();
      page?.classList.remove("motion-ready");
    };
  }, []);
  return null;
}
