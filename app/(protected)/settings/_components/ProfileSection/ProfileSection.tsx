"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { settings } from "@/actions/settings";
import { useServerAction } from "@/hooks/useServerAction";
import type { UserRole } from "@/generated/client";
import { StatusLine } from "../StatusLine";
import {
  card,
  cardTitle,
  field,
  fieldLabel,
  fieldInput,
  footerRow,
} from "../../page.css";

interface ProfileSectionProps {
  user: { name?: string; role: UserRole };
}

export function ProfileSection({ user }: ProfileSectionProps) {
  const [name, setName] = useState(user.name ?? "");
  const { run, status, isPending, setSuccess, setError, clear } =
    useServerAction(settings);

  const dirty = name.trim() !== (user.name ?? "");

  const onSave = async () => {
    clear();
    const result = await run({
      name: name.trim() || undefined,
      role: user.role,
    });
    if (!result) return;
    if (result.error) setError(result.error);
    else if (result.success) setSuccess(result.success);
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
