"use client";

import { LoginButton } from "@/components/auth/LoginButton";
import { Button, Grain } from "@/components/ui";
import {
  page,
  card,
  brand,
  brandDot,
  subtitle,
  ctaRow,
  featuresGrid,
  featureCard,
  featureHead,
  featureGlyph,
  featureTitle,
  featureBody,
} from "./page.css";

const FEATURES = [
  { glyph: "◎", title: "Plan", body: "Set goals and organize your journey." },
  { glyph: "↗", title: "Track", body: "Monitor progress and milestones." },
  { glyph: "✦", title: "Reflect", body: "Learn from experience and adapt." },
];

export default function Home() {
  return (
    <main className={page}>
      <Grain />
      <div className={card}>
        <h1 className={brand}>
          circadium<span className={brandDot} aria-hidden />
        </h1>
        <p className={subtitle}>Your future, one step at a time.</p>

        <div className={ctaRow}>
          <LoginButton asChild>
            <Button variant="solid" size="lg">
              Sign in
            </Button>
          </LoginButton>
        </div>

        <div className={featuresGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={featureCard}>
              <div className={featureHead}>
                <span className={featureGlyph}>{f.glyph}</span>
                <h3 className={featureTitle}>{f.title}</h3>
              </div>
              <p className={featureBody}>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
