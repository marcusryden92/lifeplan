"use client";

import { LoginButton } from "@/components/auth/LoginButton";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import styles from "./page.module.css";

const Home = () => {
  const [hovered, setHovered] = useState<number | null>(null);

  const features = [
    {
      title: "Plan",
      description: "Set goals and organize your journey.",
      icon: "◎",
    },
    {
      title: "Track",
      description: "Monitor progress and milestone achievements.",
      icon: "↗",
    },
    {
      title: "Reflect",
      description: "Learn from your experiences and adapt.",
      icon: "✦",
    },
  ];

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>
          <span className={styles.titleDotContainer}>
            Lifeplan<span className="text-gray-900">.</span>
            <div className={styles.titleDot}></div>
          </span>
        </h1>

        <p className={styles.subtitle}>Your future, one step at a time.</p>

        <div className={styles.loginButton}>
          <LoginButton mode="modal" asChild>
            <Button variant="default" className={styles.signInButton}>
              Sign In
            </Button>
          </LoginButton>
        </div>

        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div
              key={index}
              className={`${styles.featureCard} ${hovered === index ? styles.featureCardHovered : ""}`}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className={styles.featureIconTitle}>
                <span className={styles.featureIcon}>{feature.icon}</span>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
              </div>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>

        <div className={styles.bottomGradient}></div>
      </div>
    </main>
  );
};

export default Home;
