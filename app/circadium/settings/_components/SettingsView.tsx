"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertTriangle,
  Bell,
  Bike,
  Box,
  Calendar,
  Car,
  Footprints,
  Lock,
  LogOut,
  Plug,
  Train,
  User,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui";
import { settings } from "@/actions/settings";
import { updateDefaultTransportMode } from "@/actions/locations";
import {
  setDefaultTransportMode,
  setEnableTravelEvents,
} from "@/redux/slices/schedulingSettingsSlice";
import type { AppDispatch, RootState } from "@/redux/store";
import type { TransportMode, UserRole } from "@/lib/generated/db-client";
import {
  page,
  subHeader,
  pageTitle,
  titleSummary,
  spacer,
  userBadge,
  mainGrid,
  subnav,
  subnavItem,
  subnavItemActive,
  subnavItemDanger,
  subnavIcon,
  content,
  scrollWrap,
  pinstripeRule,
  sectionHead,
  sectionTitle,
  sectionSub,
  card,
  cardTitle,
  fieldGrid,
  field,
  fieldLabel,
  fieldInput,
  fieldNote,
  rowSplit,
  rowGrow,
  toggleRow,
  toggleMain,
  toggleHead,
  toggleBody,
  toggleSwitch,
  toggleSwitchOn,
  toggleKnob,
  toggleKnobOn,
  transportRow,
  transportBtn,
  transportBtnActive,
  providerRow,
  providerIcon,
  providerMain,
  providerName,
  providerStatus,
  footerRow,
  footerMessage,
  footerMessageSuccess,
  footerMessageError,
  comingSoon,
  comingSoonTitle,
  dangerNote,
} from "../page.css";

type SectionId =
  | "profile"
  | "account"
  | "scheduling"
  | "notifications"
  | "integrations"
  | "data"
  | "danger";

interface SectionDef {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
}

const SECTIONS: SectionDef[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: Lock },
  { id: "scheduling", label: "Scheduling", icon: Calendar },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "data", label: "Data & export", icon: Box },
  { id: "danger", label: "Danger zone", icon: AlertTriangle, danger: true },
];

interface SettingsUser {
  name?: string;
  email?: string;
  role: UserRole;
  isTwoFactorEnabled: boolean;
  isOAuth?: boolean;
}

interface SettingsViewProps {
  user: SettingsUser;
}

type StatusMessage =
  | { tone: "success" | "error"; text: string }
  | null;

export function SettingsView({ user }: SettingsViewProps) {
  const [section, setSection] = useState<SectionId>("profile");

  const sectionMeta: Record<
    SectionId,
    { title: string; sub: string }
  > = {
    profile: {
      title: "Profile",
      sub: "name",
    },
    account: {
      title: "Account",
      sub: "email · password · two-factor · linked sign-ins",
    },
    scheduling: {
      title: "Scheduling",
      sub: "transport mode · travel events",
    },
    notifications: { title: "Notifications", sub: "alerts · email digests" },
    integrations: {
      title: "Integrations",
      sub: "calendar sync · external apps",
    },
    data: { title: "Data & export", sub: "download · import · privacy" },
    danger: { title: "Danger zone", sub: "irreversible account actions" },
  };

  return (
    <div className={page}>
      <div className={subHeader}>
        <h1 className={pageTitle}>Settings</h1>
        <span className={titleSummary}>account · scheduling · workspace</span>
        <span className={spacer} />
        <span className={userBadge}>
          {user.name || user.email || "Signed in"}
        </span>
        <Button variant="glass" size="sm" onClick={() => signOut()}>
          <LogOut size={12} strokeWidth={2.2} />
          Sign out
        </Button>
      </div>

      <div className={mainGrid}>
        <nav className={subnav} aria-label="Settings sections">
          {SECTIONS.map(({ id, label, icon: Icon, danger }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                className={`${subnavItem} ${active ? subnavItemActive : ""} ${
                  !active && danger ? subnavItemDanger : ""
                }`}
                onClick={() => setSection(id)}
              >
                <span className={subnavIcon}>
                  <Icon size={14} strokeWidth={2} />
                </span>
                {label}
              </button>
            );
          })}
        </nav>

        <div className={content}>
          <div className={sectionHead}>
            <h2 className={sectionTitle}>{sectionMeta[section].title}</h2>
            <span className={sectionSub}>{sectionMeta[section].sub}</span>
          </div>
          <div className={pinstripeRule} aria-hidden />
          <div className={scrollWrap}>
            {section === "profile" && <ProfileSection user={user} />}
            {section === "account" && <AccountSection user={user} />}
            {section === "scheduling" && <SchedulingSection />}
            {section === "notifications" && (
              <ComingSoonSection
                title="Notifications"
                body="Email digests and engine alerts are coming soon. They'll let you know when the engine couldn't place something important, or summarize what's slipping this week."
              />
            )}
            {section === "integrations" && (
              <ComingSoonSection
                title="Integrations"
                body="Two-way sync with Google Calendar, Outlook, and Apple Calendar is on the roadmap. For now, Circadium runs as its own canvas."
              />
            )}
            {section === "data" && (
              <ComingSoonSection
                title="Data & export"
                body="Export your full plan, calendar history, and categories as JSON or CSV. Also planned: an import path from CSV templates."
              />
            )}
            {section === "danger" && <DangerSection />}
          </div>
          <div className={pinstripeRule} aria-hidden />
        </div>
      </div>
    </div>
  );
}

function StatusLine({ status }: { status: StatusMessage }) {
  if (!status) return <span className={footerMessage} />;
  return (
    <span
      className={`${footerMessage} ${
        status.tone === "success" ? footerMessageSuccess : footerMessageError
      }`}
    >
      {status.text}
    </span>
  );
}

function ProfileSection({ user }: { user: SettingsUser }) {
  const [name, setName] = useState(user.name ?? "");
  const [status, setStatus] = useState<StatusMessage>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = name.trim() !== (user.name ?? "");

  const onSave = () => {
    setStatus(null);
    startTransition(async () => {
      try {
        const result = await settings({
          name: name.trim() || undefined,
          role: user.role,
        });
        if (result.error) {
          setStatus({ tone: "error", text: result.error });
        } else if (result.success) {
          setStatus({ tone: "success", text: result.success });
        }
      } catch {
        setStatus({ tone: "error", text: "Something went wrong." });
      }
    });
  };

  return (
    <div className={card}>
      <span className={cardTitle}>Identity</span>
      <label className={field}>
        <span className={fieldLabel}>Name</span>
        <input
          className={fieldInput}
          value={name}
          placeholder="Your name"
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          maxLength={80}
        />
      </label>
      <div className={footerRow}>
        <StatusLine status={status} />
        <Button
          variant="solid"
          size="sm"
          onClick={onSave}
          disabled={!dirty || isPending}
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function AccountSection({ user }: { user: SettingsUser }) {
  return (
    <>
      <EmailCard user={user} />
      {!user.isOAuth && <PasswordCard userRole={user.role} />}
      {!user.isOAuth && (
        <TwoFactorCard
          initialEnabled={user.isTwoFactorEnabled}
          userRole={user.role}
        />
      )}
      <ProvidersCard user={user} />
    </>
  );
}

function EmailCard({ user }: { user: SettingsUser }) {
  const [email, setEmail] = useState(user.email ?? "");
  const [status, setStatus] = useState<StatusMessage>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = email.trim() !== (user.email ?? "");
  const disabled = !!user.isOAuth;

  const onSave = () => {
    setStatus(null);
    startTransition(async () => {
      try {
        const result = await settings({
          email: email.trim() || undefined,
          role: user.role,
        });
        if (result.error) setStatus({ tone: "error", text: result.error });
        else if (result.success)
          setStatus({ tone: "success", text: result.success });
      } catch {
        setStatus({ tone: "error", text: "Something went wrong." });
      }
    });
  };

  return (
    <div className={card}>
      <span className={cardTitle}>Email</span>
      <label className={field}>
        <span className={fieldLabel}>Current</span>
        <input
          className={fieldInput}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={disabled || isPending}
        />
      </label>
      <span className={fieldNote}>
        {disabled
          ? "Your email is managed by your OAuth provider — change it there."
          : "Changing email sends a verification link to the new address. The change isn't applied until you click the link."}
      </span>
      {!disabled && (
        <div className={footerRow}>
          <StatusLine status={status} />
          <Button
            variant="solid"
            size="sm"
            onClick={onSave}
            disabled={!dirty || isPending}
          >
            {isPending ? "Sending…" : "Send verification"}
          </Button>
        </div>
      )}
    </div>
  );
}

function PasswordCard({ userRole }: { userRole: UserRole }) {
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [status, setStatus] = useState<StatusMessage>(null);
  const [isPending, startTransition] = useTransition();

  const filled =
    password.length > 0 && newPassword.length > 0 && confirmNewPassword.length > 0;
  const matches = newPassword === confirmNewPassword;

  const onSave = () => {
    setStatus(null);
    if (!matches) {
      setStatus({ tone: "error", text: "New passwords don't match." });
      return;
    }
    startTransition(async () => {
      try {
        const result = await settings({
          password,
          newPassword,
          confirmNewPassword,
          role: userRole,
        });
        if (result.error) {
          setStatus({ tone: "error", text: result.error });
        } else if (result.success) {
          setStatus({ tone: "success", text: result.success });
          setPassword("");
          setNewPassword("");
          setConfirmNewPassword("");
        }
      } catch {
        setStatus({ tone: "error", text: "Something went wrong." });
      }
    });
  };

  return (
    <div className={card}>
      <span className={cardTitle}>Password</span>
      <div className={fieldGrid}>
        <label className={field}>
          <span className={fieldLabel}>Current</span>
          <input
            className={fieldInput}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={isPending}
          />
        </label>
        <label className={field}>
          <span className={fieldLabel}>New</span>
          <input
            className={fieldInput}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            disabled={isPending}
            placeholder="At least 6 characters"
          />
        </label>
        <label className={field}>
          <span className={fieldLabel}>Confirm new</span>
          <input
            className={fieldInput}
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            autoComplete="new-password"
            disabled={isPending}
            placeholder="Retype new"
          />
        </label>
      </div>
      <div className={footerRow}>
        <StatusLine status={status} />
        <Button
          variant="solid"
          size="sm"
          onClick={onSave}
          disabled={!filled || isPending}
        >
          {isPending ? "Saving…" : "Update password"}
        </Button>
      </div>
    </div>
  );
}

function TwoFactorCard({
  initialEnabled,
  userRole,
}: {
  initialEnabled: boolean;
  userRole: UserRole;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [status, setStatus] = useState<StatusMessage>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setStatus(null);
    startTransition(async () => {
      try {
        const result = await settings({
          isTwoFactorEnabled: next,
          role: userRole,
        });
        if (result.error) {
          setEnabled(!next);
          setStatus({ tone: "error", text: result.error });
        } else if (result.success) {
          setStatus({
            tone: "success",
            text: next
              ? "Two-factor authentication enabled."
              : "Two-factor authentication disabled.",
          });
        }
      } catch {
        setEnabled(!next);
        setStatus({ tone: "error", text: "Something went wrong." });
      }
    });
  };

  return (
    <div className={card}>
      <span className={cardTitle}>Two-factor authentication</span>
      <div className={toggleRow}>
        <div className={toggleMain}>
          <div className={toggleHead}>Email verification on sign-in</div>
          <div className={toggleBody}>
            {enabled
              ? "On — we'll email a code each time you sign in from a new device."
              : "Off — sign-in only requires your password."}
          </div>
        </div>
        <button
          type="button"
          className={`${toggleSwitch} ${enabled ? toggleSwitchOn : ""}`}
          onClick={toggle}
          disabled={isPending}
          aria-pressed={enabled}
          aria-label="Toggle two-factor authentication"
        >
          <span className={`${toggleKnob} ${enabled ? toggleKnobOn : ""}`} />
        </button>
      </div>
      {status && (
        <div className={footerRow}>
          <StatusLine status={status} />
        </div>
      )}
    </div>
  );
}

function ProvidersCard({ user }: { user: SettingsUser }) {
  return (
    <div className={card}>
      <span className={cardTitle}>Linked sign-ins</span>
      <div className={providerRow}>
        <span className={providerIcon}>G</span>
        <div className={providerMain}>
          <div className={providerName}>Google</div>
          <div className={providerStatus}>
            {user.isOAuth ? `linked · ${user.email}` : "not connected"}
          </div>
        </div>
      </div>
      <div className={providerRow}>
        <span className={providerIcon}>⌥</span>
        <div className={providerMain}>
          <div className={providerName}>GitHub</div>
          <div className={providerStatus}>not connected</div>
        </div>
      </div>
      <span className={fieldNote}>
        Connecting additional providers is on the roadmap.
      </span>
    </div>
  );
}

function SchedulingSection() {
  const dispatch = useDispatch<AppDispatch>();
  const transportMode = useSelector(
    (state: RootState) => state.schedulingSettings.defaultTransportMode,
  );
  const enableTravelEvents = useSelector(
    (state: RootState) => state.schedulingSettings.enableTravelEvents,
  );
  const bufferTimeMinutes = useSelector(
    (state: RootState) => state.schedulingSettings.bufferTimeMinutes,
  );
  const [status, setStatus] = useState<StatusMessage>(null);
  const [isPending, startTransition] = useTransition();

  const setMode = (mode: TransportMode) => {
    if (mode === transportMode) return;
    dispatch(setDefaultTransportMode(mode));
    setStatus(null);
    startTransition(async () => {
      try {
        await updateDefaultTransportMode(mode);
        setStatus({ tone: "success", text: "Transport mode updated." });
      } catch {
        setStatus({ tone: "error", text: "Failed to save transport mode." });
      }
    });
  };

  const toggleTravelEvents = () => {
    dispatch(setEnableTravelEvents(!enableTravelEvents));
  };

  const MODES: { value: TransportMode; label: string; Icon: LucideIcon }[] = [
    { value: "DRIVING", label: "Driving", Icon: Car },
    { value: "TRANSIT", label: "Transit", Icon: Train },
    { value: "BICYCLING", label: "Cycling", Icon: Bike },
    { value: "WALKING", label: "Walking", Icon: Footprints },
  ];

  return (
    <>
      <div className={card}>
        <span className={cardTitle}>Default transport mode</span>
        <span className={fieldNote}>
          Used as the baseline mode when calculating travel times between
          locations.
        </span>
        <div className={transportRow}>
          {MODES.map(({ value, label, Icon }) => {
            const active = value === transportMode;
            return (
              <button
                key={value}
                type="button"
                className={`${transportBtn} ${active ? transportBtnActive : ""}`}
                onClick={() => setMode(value)}
                disabled={isPending}
              >
                <Icon size={16} strokeWidth={2} />
                {label}
              </button>
            );
          })}
        </div>
        <div className={footerRow}>
          <StatusLine status={status} />
        </div>
      </div>

      <div className={card}>
        <span className={cardTitle}>Travel events on the calendar</span>
        <div className={toggleRow}>
          <div className={toggleMain}>
            <div className={toggleHead}>Show travel as its own block</div>
            <div className={toggleBody}>
              When on, travel time between two locations appears as a separate
              event on the calendar. When off, it's absorbed into the
              surrounding events.
            </div>
          </div>
          <button
            type="button"
            className={`${toggleSwitch} ${enableTravelEvents ? toggleSwitchOn : ""}`}
            onClick={toggleTravelEvents}
            aria-pressed={enableTravelEvents}
            aria-label="Toggle travel events"
          >
            <span
              className={`${toggleKnob} ${enableTravelEvents ? toggleKnobOn : ""}`}
            />
          </button>
        </div>
      </div>

      <div className={card}>
        <span className={cardTitle}>Tuning</span>
        <div className={rowSplit}>
          <div className={rowGrow}>
            <div className={toggleHead}>
              Buffer between items · {bufferTimeMinutes} min
            </div>
            <div className={toggleBody}>
              Engine weights and the buffer slider live in the engine drawer on
              the Calendar — open it from the cog in the top-right.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ComingSoonSection({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className={card}>
      <div className={comingSoon}>
        <span className={comingSoonTitle}>{title} · coming soon</span>
        <span>{body}</span>
      </div>
    </div>
  );
}

function DangerSection() {
  return (
    <div className={card}>
      <span className={cardTitle}>Account deletion</span>
      <div className={dangerNote}>
        Permanent account deletion isn't wired up yet. When it is, this is where
        you'll be able to download your data and remove everything.
      </div>
    </div>
  );
}
