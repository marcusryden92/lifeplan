"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarClock,
  ListTree,
  Route,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui";
import { themeLight } from "@/lib/theme";
import { VectorField } from "@/components/landing/VectorField";
import {
  page,
  navBar,
  navWordmark,
  navActions,
  hero,
  introSection,
  introHeadline,
  introSubhead,
  introBody,
  introCta,
  introCtaNote,
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
  featureIconWrap,
  featureContent,
  featureIndex,
  featureName,
  featureBody,
  closeSection,
  closeCard,
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
};

type Feature = {
  Icon: LucideIcon;
  name: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    Icon: Workflow,
    name: "A scheduling engine",
    body: "Tell Circadium what matters. It returns a week that respects your goals, your deadlines, and the constraints around them — without you arranging a single block.",
  },
  {
    Icon: Route,
    name: "Locations & travel",
    body: "Every place you work from, every commute between them. The engine knows what's reachable and routes time across driving, transit, cycling, and walking.",
  },
  {
    Icon: CalendarClock,
    name: "Time-aware categories",
    body: "Define when each part of life is allowed to happen. Strict windows that block everything else, soft ones that only suggest. Deep work mornings, errands after five.",
  },
  {
    Icon: ListTree,
    name: "Goals with subtasks",
    body: "Break large goals into ordered steps. Mark dependencies between them. The engine schedules subtasks in the order they have to happen, not just the order you wrote them.",
  },
];

const SECTIONS: Section[] = [
  {
    kicker: "The problem",
    heading: "Most people don't have a productivity problem.",
    body: [
      { text: "They have an allocation problem.", emphasis: true },
      {
        text: "There are more goals, obligations, opportunities, and demands than can possibly fit into a week. No system can change that. No amount of organization can change that.",
      },
      { text: "The question isn't how to fit more in." },
      {
        text: "The question is what deserves a place in your time.",
        emphasis: true,
      },
      {
        text: "Circadium starts with the outcomes you're trying to achieve, then computes a schedule that reflects them.",
      },
      { text: "Not the ideal week." },
      { text: "The real one.", emphasis: true },
    ],
  },
  {
    kicker: "The approach",
    heading: "Built around reality.",
    body: [
      { text: "Your schedule doesn't exist in a vacuum." },
      {
        text: "Work happens in places. Meetings take time. Commutes exist. Energy changes throughout the day.",
      },
      {
        text: "Circadium accounts for where things happen, how long it takes to get there, when you're available, and how you prefer to spend your time.",
      },
      {
        text: "Deep work in the morning. Meetings in the afternoon. Gym after work. Client visits across town.",
      },
      { text: "The result isn't a perfectly optimized calendar." },
      { text: "It's a week you can actually live.", emphasis: true },
    ],
  },
  {
    kicker: "The friction",
    dark: true,
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
    heading: "More productivity isn't always progress.",
    body: [
      {
        text: "Most productivity software is designed to help you do more — more tasks, more projects, more output.",
      },
      {
        text: "But doing more isn't the same as moving forward.",
        emphasis: true,
      },
      { text: "Circadium is built on a simpler idea:" },
      { text: "The purpose of a schedule isn't to maximize activity." },
      {
        text: "It's to make sure your limited time is spent on the things that matter most.",
        emphasis: true,
      },
      { text: "Sometimes that means doing more." },
      { text: "Sometimes it means doing less." },
    ],
  },
];

export default function Home() {
  const router = useRouter();
  const goLogin = () => router.push("/auth/login");
  const goRegister = () => router.push("/auth/register");

  return (
    <main className={`${themeLight} ${page} custom-scrollbar`}>
      <nav className={navBar}>
        <Link href="/" className={navWordmark}>
          Circadium
        </Link>
        <div className={navActions}>
          <Button variant="ghost" size="md" onClick={goLogin}>
            Sign in
          </Button>
          <Button variant="solid" size="md" onClick={goRegister}>
            Start free
          </Button>
        </div>
      </nav>

      <section className={hero}>
        <VectorField />
      </section>

      <section className={introSection}>
        <h2 className={introHeadline}>
          The app that makes you <em>less</em> productive.
        </h2>
        <p className={introSubhead}>
          Because productivity isn&apos;t the goal.
        </p>
        <div className={introBody}>
          <p>
            A productive day can still be a wasted day. You can clear your
            inbox, finish a dozen tasks, attend every meeting, and make no
            meaningful progress on what actually matters.
          </p>
          <p>
            Circadium computes a week around your goals, commitments, locations,
            and constraints — then adapts as life changes.
          </p>
        </div>
        <div className={introCta}>
          <Button variant="solid" size="lg" onClick={goRegister}>
            Start free →
          </Button>
          <span className={introCtaNote}>Free while in beta.</span>
        </div>
      </section>

      <div className={prose}>
        {SECTIONS.map((s, i) => (
          <section
            key={s.heading}
            className={s.dark ? proseSectionDark : proseSection}
          >
            <div className={proseGrid}>
              <aside className={proseAside}>
                <span className={proseNumber}>
                  {String(i + 1).padStart(2, "0")}
                  <span aria-hidden> / 04</span>
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
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className={featuresSection}>
        <header className={featuresHeader}>
          <p className={featuresKicker}>What&apos;s in it</p>
          <h2 className={featuresHeading}>Four moving parts.</h2>
        </header>
        <div className={featuresList}>
          {FEATURES.map((f, i) => {
            const reversed = i % 2 === 1;
            const visual = (
              <div className={featureVisual} aria-hidden>
                <div className={featureIconWrap}>
                  <f.Icon size={88} strokeWidth={1.25} />
                </div>
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
              <article
                key={f.name}
                className={reversed ? featureRowReverse : featureRow}
              >
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
            );
          })}
        </div>
      </section>

      <section className={closeSection}>
        <div className={closeCard}>
          <h2 className={closeHeading}>Your week reveals your priorities.</h2>
          <p className={closeBody}>
            Circadium helps make sure they&apos;re the right ones.
          </p>
          <div className={closeActions}>
            <Button variant="solidLight" size="lg" onClick={goRegister}>
              Start free →
            </Button>
          </div>
          <p className={closeNote}>
            Free while in beta. Your data stays yours.
          </p>
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
