"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { themeLight } from "@/lib/theme";
import { VectorField } from "@/components/landing/VectorField";
import {
  page,
  aboveFold,
  hero,
  titleRow,
  wordmark,
  ctaCluster,
  featuresSection,
  sectionInner,
  sectionLead,
  sectionTitle,
  featureGrid,
  featureTile,
  featureGlyph,
  featureTitle,
  featureBody,
  demoSection,
  demoCard,
  ctaSection,
  ctaCard,
  ctaTitle,
  ctaBody,
  ctaActions,
  footer,
  footerLinks,
  footerLink,
} from "./page.css";

const FEATURES = [
  {
    glyph: "◎",
    title: "Engine, not a list",
    body: "Tell Circadium your goals, your deadlines, and where you'll be. It builds the week. You stop dragging tiles around a grid.",
  },
  {
    glyph: "↗",
    title: "Whole life, one plan",
    body: "Sleep, training, errands, family, deep work, commutes — every part of your life sits in the same calendar. Nothing pretends to coexist.",
  },
  {
    glyph: "✦",
    title: "Stays honest",
    body: "Things slip. Things move. The next plan accounts for what actually happened, not what you wrote down a week ago.",
  },
];

export default function Home() {
  const router = useRouter();
  const goLogin = () => router.push("/auth/login");
  const goRegister = () => router.push("/auth/register");

  return (
    <main className={`${themeLight} ${page}`}>
      <section className={aboveFold}>
        <section className={hero}>
          <VectorField />
        </section>
        <section className={titleRow}>
          <h1 className={wordmark}>Circadium</h1>
          <div className={ctaCluster}>
            <Button variant="outlined" size="lg" onClick={goLogin}>
              Sign in
            </Button>
            <Button variant="solid" size="lg" onClick={goRegister}>
              Get started
            </Button>
          </div>
        </section>
      </section>

      <section className={featuresSection}>
        <div className={sectionInner}>
          <p className={sectionLead}>What it is</p>
          <h2 className={sectionTitle}>
            A scheduling engine for the whole life — not just the workday.
          </h2>
          <div className={featureGrid}>
            {FEATURES.map((f) => (
              <article key={f.title} className={featureTile}>
                <span className={featureGlyph} aria-hidden>
                  {f.glyph}
                </span>
                <h3 className={featureTitle}>{f.title}</h3>
                <p className={featureBody}>{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={demoSection}>
        <div className={sectionInner}>
          <p className={sectionLead}>See a week</p>
          <h2 className={sectionTitle}>Drawn for you, in seconds.</h2>
          <div className={demoCard}>[ Calendar preview ]</div>
        </div>
      </section>

      <section className={ctaSection}>
        <div className={sectionInner}>
          <div className={ctaCard}>
            <h2 className={ctaTitle}>Build a week that holds.</h2>
            <p className={ctaBody}>
              Free while we build. Bring your goals, your places, your
              constraints — Circadium does the math.
            </p>
            <div className={ctaActions}>
              <Button variant="solidLight" size="lg" onClick={goRegister}>
                Get started
              </Button>
              <Button variant="glass" size="lg" onClick={goLogin}>
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className={footer}>
        <span>© {new Date().getFullYear()} Circadium</span>
        <div className={footerLinks}>
          <Link href="#" className={footerLink}>
            Terms
          </Link>
          <Link href="#" className={footerLink}>
            Privacy
          </Link>
          <Link href="#" className={footerLink}>
            Contact
          </Link>
        </div>
      </footer>
    </main>
  );
}
