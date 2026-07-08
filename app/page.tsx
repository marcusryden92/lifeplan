"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Grain } from "@/components/ui";
import { themeLight } from "@/lib/theme";
import { VectorField } from "@/components/landing/VectorField";
import { Reveal } from "@/components/landing/Reveal";
import {
  FeatureVignette,
  type FeatureVignetteKind,
} from "@/components/landing/FeatureVignettes";
import { ReflowDemo } from "@/components/landing/ReflowDemo";
import {
  page,
  hero,
  heroScrim,
  heroNav,
  heroWordmark,
  heroLogo,
  heroTitle,
  navActions,
  heroSignIn,
  heroContent,
  heroHeadline,
  heroSubhead,
  heroCta,
  heroCtaNote,
  pillNav,
  pillNavVisible,
  pillNavSecondary,
  pillNavWordmark,
  pillNavLogo,
  pillNavTitle,
  leadSection,
  leadInner,
  leadText,
  leadEmphasis,
  prose,
  proseSection,
  proseSectionDark,
  proseGrid,
  proseAside,
  proseNumber,
  proseRule,
  proseHeading,
  proseBody,
  proseLine,
  proseEmphasis,
  featuresSection,
  featuresHeader,
  featuresKicker,
  featuresHeading,
  featuresList,
  featureRow,
  featureRowReverse,
  featureVisual,
  featureContent,
  featureIndex,
  featureName,
  featureBody,
  closeSection,
  closeCard,
  closeScrim,
  closeInner,
  closeHeading,
  closeBody,
  closeActions,
  closeNote,
  footer,
  footerLinks,
  footerLink,
} from "./page.css";

type Line = { text: string; emphasis?: boolean };

type Section = {
  heading: string;
  kicker: string;
  body: Line[];
  dark?: boolean;
  demo?: boolean;
};

type Feature = {
  kind: FeatureVignetteKind;
  name: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    kind: "engine",
    name: "A scheduling engine",
    body: "Tell Circadium what matters. It returns a week that respects your goals, your deadlines, and the constraints around them — without you arranging a single block.",
  },
  {
    kind: "travel",
    name: "Locations & travel",
    body: "Every place you work from, every commute between them. The engine knows what's reachable and routes time across driving, transit, cycling, and walking.",
  },
  {
    kind: "windows",
    name: "Time-aware categories",
    body: "Define when each part of life is allowed to happen. Strict windows that block everything else, soft ones that only suggest. Deep work mornings, errands after five.",
  },
  {
    kind: "goals",
    name: "Goals with subtasks",
    body: "Break large goals into ordered steps. The engine schedules them in sequence — each step placed after the one before, woven around everything else in your week.",
  },
];

const SECTIONS: Section[] = [
  {
    kicker: "The problem",
    heading: "Planning is two jobs.",
    body: [
      {
        text: "Deciding what matters — and arranging when it all happens.",
        emphasis: true,
      },
      {
        text: "The first job is yours alone. It takes judgment: your goals, your values, your call.",
      },
      {
        text: "The second is logistics. Durations, deadlines, locations, travel, open slots — a constraint problem with a thousand moving pieces.",
      },
      { text: "You were never meant to solve that one by hand." },
      {
        text: "Circadium takes the second job off your hands entirely.",
        emphasis: true,
      },
      { text: "You set the direction." },
      { text: "It builds the week.", emphasis: true },
    ],
  },
  {
    kicker: "The friction",
    dark: true,
    demo: true,
    heading: "Stop rebuilding your week by hand.",
    body: [
      { text: "Most planning systems break the moment something changes." },
      { text: "A meeting gets added." },
      { text: "A task takes longer than expected." },
      { text: "A priority shifts." },
      {
        text: "Now you're back to dragging blocks around a calendar and figuring out what needs to move.",
      },
      { text: "Circadium handles that automatically.", emphasis: true },
      {
        text: "When circumstances change, the schedule is recomputed. When priorities change, the week changes with them.",
      },
      { text: "You decide what matters." },
      { text: "The engine handles the tradeoffs.", emphasis: true },
    ],
  },
  {
    kicker: "The point",
    heading: "A productive day can still be a wasted day.",
    body: [
      {
        text: "You can clear your inbox, finish a dozen tasks, sit through every meeting — and make no real progress on anything that matters.",
      },
      {
        text: "Doing more isn't the same as moving forward.",
        emphasis: true,
      },
      { text: "Circadium is built on a simpler idea:" },
      { text: "A schedule isn't for maximizing activity." },
      {
        text: "It's for making sure your limited time goes where you actually want it.",
        emphasis: true,
      },
    ],
  },
];

const SECTION_TOTAL = String(SECTIONS.length).padStart(2, "0");

export default function Home() {
  const router = useRouter();
  const heroRef = useRef<HTMLElement>(null);
  const [pastHero, setPastHero] = useState(false);
  const goLogin = () => router.push("/auth/login");
  const goRegister = () => router.push("/auth/register");

  useEffect(() => {
    const node = heroRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <main className={`${themeLight} ${page} custom-scrollbar`}>
      <div className={pastHero ? `${pillNav} ${pillNavVisible}` : pillNav}>
        <Link href="/" className={pillNavWordmark}>
          <span className={pillNavLogo} aria-hidden />
          <span className={pillNavTitle}>Circadium</span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className={pillNavSecondary}
          onClick={goLogin}
        >
          Sign in
        </Button>
        <Button variant="solid" size="sm" onClick={goRegister}>
          Start free
        </Button>
      </div>

      <section ref={heroRef} className={hero}>
        <VectorField />
        <div className={heroScrim} aria-hidden />
        <header className={heroNav}>
          <Link href="/" className={heroWordmark}>
            <span className={heroLogo} aria-hidden />
            <span className={heroTitle}>Circadium</span>
          </Link>
          <div className={navActions}>
            <button type="button" className={heroSignIn} onClick={goLogin}>
              Sign in
            </button>
            <Button variant="solidLight" size="md" onClick={goRegister}>
              Start free
            </Button>
          </div>
        </header>
        <div className={heroContent}>
          <h1 className={heroHeadline}>
            Never <em>plan</em> a day again
          </h1>
          <p className={heroSubhead}>Just live it.</p>
          <div className={heroCta}>
            <Button variant="solidLight" size="lg" onClick={goRegister}>
              Start free →
            </Button>
            <span className={heroCtaNote}>Free while in beta.</span>
          </div>
        </div>
      </section>

      <section className={leadSection}>
        <Reveal>
          <div className={leadInner}>
            <p className={leadText}>
              Keeping a calendar is quiet, constant work. Arranging blocks,
              resolving conflicts, rebuilding the week every time something
              moves — hours of planning that produce nothing on their own.
            </p>
            <p className={leadText}>
              Circadium computes a week around your goals, commitments,
              locations, and constraints — then adapts as life changes.
            </p>
            <p className={leadEmphasis}>
              The result isn&apos;t a perfectly optimized calendar. It&apos;s a
              week you can actually live.
            </p>
          </div>
        </Reveal>
      </section>

      <div className={prose}>
        {SECTIONS.map((s, i) => (
          <section
            key={s.heading}
            className={s.dark ? proseSectionDark : proseSection}
          >
            {s.dark ? <Grain /> : null}
            <Reveal>
              <div className={proseGrid}>
                <aside className={proseAside}>
                  <span className={proseNumber}>
                    {String(i + 1).padStart(2, "0")}
                    <span aria-hidden> / {SECTION_TOTAL}</span>
                  </span>
                  <span className={proseRule} aria-hidden />
                  <span>{s.kicker}</span>
                </aside>
                <div>
                  <h2 className={proseHeading}>{s.heading}</h2>
                  <div className={proseBody}>
                    {s.body.map((line, j) => (
                      <p
                        key={j}
                        className={line.emphasis ? proseEmphasis : proseLine}
                      >
                        {line.text}
                      </p>
                    ))}
                  </div>
                  {s.demo ? <ReflowDemo /> : null}
                </div>
              </div>
            </Reveal>
          </section>
        ))}
      </div>

      <section className={featuresSection}>
        <Reveal>
          <header className={featuresHeader}>
            <p className={featuresKicker}>What&apos;s in it</p>
            <h2 className={featuresHeading}>Four moving parts.</h2>
          </header>
        </Reveal>
        <div className={featuresList}>
          {FEATURES.map((f, i) => {
            const reversed = i % 2 === 1;
            const visual = (
              <div className={featureVisual}>
                <FeatureVignette kind={f.kind} />
              </div>
            );
            const content = (
              <div className={featureContent}>
                <span className={featureIndex}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className={featureName}>{f.name}</h3>
                <p className={featureBody}>{f.body}</p>
              </div>
            );
            return (
              <Reveal key={f.name}>
                <article className={reversed ? featureRowReverse : featureRow}>
                  {reversed ? (
                    <>
                      {content}
                      {visual}
                    </>
                  ) : (
                    <>
                      {visual}
                      {content}
                    </>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className={closeSection}>
        <div className={closeCard}>
          <VectorField
            settings={{
              density: 1.0,
              speed: 0.55,
              strength: 1.15,
              mforce: 0.8,
            }}
          />
          <div className={closeScrim} aria-hidden />
          <Grain />
          <Reveal className={closeInner}>
            <h2 className={closeHeading}>Go live your week.</h2>
            <p className={closeBody}>
              Circadium handles the planning — this one, and every one after it.
            </p>
            <div className={closeActions}>
              <Button variant="solidLight" size="lg" onClick={goRegister}>
                Build your first week →
              </Button>
            </div>
            <p className={closeNote}>
              Free while in beta. Your data stays yours.
            </p>
          </Reveal>
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
