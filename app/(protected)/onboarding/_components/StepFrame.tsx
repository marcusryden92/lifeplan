"use client";

import type { ReactNode } from "react";
import {
  frameWrap,
  card,
  topRow,
  progress,
  segment,
  segmentFilled,
  skipLink,
  title as titleCls,
  subtitle as subtitleCls,
  body,
  footer,
} from "../onboarding.css";

type StepFrameProps = {
  stepIndex: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
  onSkip?: () => void;
};

export function StepFrame({
  stepIndex,
  totalSteps,
  title,
  subtitle,
  children,
  footer: footerNode,
  onSkip,
}: StepFrameProps) {
  return (
    <div className={frameWrap}>
      <div className={card}>
        <div className={topRow}>
          <div className={progress}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`${segment} ${i <= stepIndex ? segmentFilled : ""}`}
              />
            ))}
          </div>
          {onSkip && (
            <button type="button" className={skipLink} onClick={onSkip}>
              Skip
            </button>
          )}
        </div>

        <div>
          <h1 className={titleCls}>{title}</h1>
          {subtitle && <p className={subtitleCls}>{subtitle}</p>}
        </div>

        <div className={body}>{children}</div>

        <div className={footer}>{footerNode}</div>
      </div>
    </div>
  );
}
