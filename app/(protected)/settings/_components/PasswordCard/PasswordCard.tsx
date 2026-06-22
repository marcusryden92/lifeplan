"use client";

import { Button } from "@/components/ui";
import type { UserRole } from "@/lib/generated/db-client";
import { StatusLine } from "../StatusLine";
import {
  card,
  cardTitle,
  fieldGrid,
  field,
  fieldLabel,
  fieldInput,
  footerRow,
} from "../../page.css";
import { usePasswordChange } from "./usePasswordChange";

interface PasswordCardProps {
  userRole: UserRole;
}

export function PasswordCard({ userRole }: PasswordCardProps) {
  const { values, setters, status, isPending, filled, submit } =
    usePasswordChange(userRole);

  return (
    <div className={card}>
      <span className={cardTitle}>Password</span>
      <div className={fieldGrid}>
        <label className={field}>
          <span className={fieldLabel}>Current</span>
          <input
            className={fieldInput}
            type="password"
            value={values.password}
            onChange={(e) => setters.setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={isPending}
          />
        </label>
        <label className={field}>
          <span className={fieldLabel}>New</span>
          <input
            className={fieldInput}
            type="password"
            value={values.newPassword}
            onChange={(e) => setters.setNewPassword(e.target.value)}
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
            value={values.confirmNewPassword}
            onChange={(e) => setters.setConfirmNewPassword(e.target.value)}
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
          onClick={submit}
          disabled={!filled || isPending}
        >
          {isPending ? "Saving…" : "Update password"}
        </Button>
      </div>
    </div>
  );
}
