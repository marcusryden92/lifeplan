"use client";

import { LoginButton } from "@/components/auth/LoginButton";
import { Button } from "@/components/ui";
import { themeLight } from "@/lib/theme";
import { VectorField } from "@/components/landing/VectorField";
import {
  page,
  hero,
  signInWrap,
  titleRow,
  wordmark,
} from "./page.css";

export default function Home() {
  return (
    <main className={`${themeLight} ${page}`}>
      <section className={hero}>
        <VectorField />
        <div className={signInWrap}>
          <LoginButton asChild>
            <Button variant="glass" size="md">
              Sign in
            </Button>
          </LoginButton>
        </div>
      </section>
      <section className={titleRow}>
        <h1 className={wordmark}>Circadium</h1>
      </section>
    </main>
  );
}
