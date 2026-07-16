"use client";

import { MotionConfig } from "motion/react";
import { DemoTimeProvider } from "@/lib/demoTime";
import { AppProvider } from "@/lib/store";
import { ToastProvider } from "./Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <DemoTimeProvider>
        <AppProvider>
          <ToastProvider>{children}</ToastProvider>
        </AppProvider>
      </DemoTimeProvider>
    </MotionConfig>
  );
}
