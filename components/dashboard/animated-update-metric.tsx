"use client";

import { useEffect, useRef, useState } from "react";

function formatValue(value: number, decimals: number, suffix: string) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}${suffix}`;
}

export function AnimatedUpdateMetric({ value, suffix = "" }: { value: number | null; suffix?: string }) {
  const decimals = value !== null && !Number.isInteger(value) ? 1 : 0;
  const [display, setDisplay] = useState(value === null ? "—" : formatValue(value, decimals, suffix));
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (value === null) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !elementRef.current || typeof IntersectionObserver === "undefined") {
      setDisplay(formatValue(value, decimals, suffix));
      return;
    }
    const element = elementRef.current;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const duration = 850;
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(formatValue(value * eased, decimals, suffix));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.35 });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [decimals, suffix, value]);

  return <span ref={elementRef}>{display}</span>;
}
